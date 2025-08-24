import { parseStringPromise } from "xml2js";

export async function parseInvoiceXML(file: File): Promise<any> {
  const text = await file.text();
  const jsonData = await parseStringPromise(text, { explicitArray: false });
  return jsonData;
}
