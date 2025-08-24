import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PresignRequest {
  mode: 'put' | 'get';
  path: string;
  contentType?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { mode, path, contentType }: PresignRequest = await req.json();

    // Get R2 configuration from environment
    const r2Endpoint = Deno.env.get('R2_ENDPOINT');
    const r2Bucket = Deno.env.get('R2_BUCKET');
    const r2Key = Deno.env.get('R2_KEY');
    const r2Secret = Deno.env.get('R2_SECRET');

    if (!r2Endpoint || !r2Bucket || !r2Key || !r2Secret) {
      return new Response(JSON.stringify({ error: 'R2 configuration missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Replace placeholders in path
    const currentYear = new Date().getFullYear().toString();
    const finalPath = path
      .replace('<user>', user.id)
      .replace('<yyyy>', currentYear);

    // Generate presigned URL
    const url = await generatePresignedUrl({
      endpoint: r2Endpoint,
      bucket: r2Bucket,
      key: finalPath,
      accessKeyId: r2Key,
      secretAccessKey: r2Secret,
      method: mode === 'put' ? 'PUT' : 'GET',
      contentType: contentType,
      expiresIn: 3600, // 1 hour
    });

    console.log(`Generated presigned URL for ${mode.toUpperCase()} ${finalPath}`);

    return new Response(JSON.stringify({ url, path: finalPath }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in s3-presign function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generatePresignedUrl({
  endpoint,
  bucket,
  key,
  accessKeyId,
  secretAccessKey,
  method = 'GET',
  contentType,
  expiresIn = 3600,
}: {
  endpoint: string;
  bucket: string;
  key: string;
  accessKeyId: string;
  secretAccessKey: string;
  method?: string;
  contentType?: string;
  expiresIn?: number;
}): Promise<string> {
  const url = new URL(`${endpoint}/${bucket}/${key}`);
  const now = new Date();
  const expiration = new Date(now.getTime() + expiresIn * 1000);

  // AWS Signature Version 4
  const region = 'auto'; // Cloudflare R2 uses 'auto'
  const service = 's3';
  
  const timestamp = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
  const datestamp = timestamp.substr(0, 8);
  
  const credential = `${accessKeyId}/${datestamp}/${region}/${service}/aws4_request`;
  
  // Query parameters
  const params = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': timestamp,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': 'host',
  });

  if (contentType && method === 'PUT') {
    params.set('X-Amz-Content-Type', contentType);
  }

  url.search = params.toString();

  // Create canonical request
  const canonicalUri = `/${bucket}/${key}`;
  const canonicalQuerystring = params.toString();
  const canonicalHeaders = `host:${url.hostname}\n`;
  const signedHeaders = 'host';
  const payloadHash = 'UNSIGNED-PAYLOAD';

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  // Create string to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    timestamp,
    credentialScope,
    await sha256(canonicalRequest),
  ].join('\n');

  // Calculate signature
  const signingKey = await getSignatureKey(secretAccessKey, datestamp, region, service);
  const signature = await hmacSha256(signingKey, stringToSign);

  // Add signature to URL
  url.searchParams.set('X-Amz-Signature', signature);

  return url.toString();
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key: ArrayBuffer, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Promise<ArrayBuffer> {
  const kDate = await hmacSha256Raw(new TextEncoder().encode('AWS4' + key), dateStamp);
  const kRegion = await hmacSha256Raw(kDate, regionName);
  const kService = await hmacSha256Raw(kRegion, serviceName);
  const kSigning = await hmacSha256Raw(kService, 'aws4_request');
  return kSigning;
}

async function hmacSha256Raw(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}