export interface InvoiceInfo {
  recipient: string | null;
  invoiceNo: string | null;
  series: string | null;
  totalValue: string | null;
  accessKey: string | null;
  natureOperation: string | null;
  cnpj: string | null;
  company: string | null;
  dateIssue: string | null;
  dateEntry: string | null;
  timeEntry: string | null;
}

// Regex patterns for Brazilian invoices
const CNPJ_REGEX = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/;
const DATE_REGEX = /\b\d{2}\/\d{2}\/\d{4}\b/;
const PERIOD_REGEX = /(0[1-9]|1[0-2])\/\d{4}/; // e.g., 09/2023

export function extractInvoiceInfo(text: string): InvoiceInfo {
  // const cnpjMatch = text.match(CNPJ_REGEX);
  // const dateMatch = text.match(DATE_REGEX);
  // const periodMatch = text.match(PERIOD_REGEX);

  const recipient = text.match(/DESTINATÁRIO\s+([A-Z\s]+)/i)?.[1] ?? null;
  const invoiceNo = text.match(/N[º°]\s*(\d+)/i)?.[1] ?? null;
  const series = text.match(/S[ÉE]RIE\s*(\d+)/i)?.[1] ?? null;
  const totalValue = text.match(/VALOR TOTAL DA NOTA\s*R?\$?\s*([\d.,]+)/i)?.[1] ?? null;
  const accessKey = text.match(/\d{44}/i)?.[1]?.replace(/\s/g, "") ?? null;
  const natureOperation = text.match(/NATUREZA DA OPERA[ÇC][ÃA]O\s+([A-Z0-9\s\-]+)/i)?.[1] ?? null;
  const cnpj = text.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}\b/)?.[0] ?? null;
  const company = text.match(/NOME\/RAZ[ÃA]O SOCIAL\s+([A-Z\s]+)/i)?.[1] ?? null;
  const dateIssue = text.match(/DATA DA EMISS[ÃA]O\s+(\d{2}\/\d{2}\/\d{4})/i)?.[1] ?? null;
  const dateEntry = text.match(/DATA DA ENTRADA\/SA[ÍI]DA\s+(\d{2}\/\d{2}\/\d{4})/i)?.[1] ?? null;
  const timeEntry = text.match(/HORA DA ENTRADA\/SA[ÍI]DA\s+(\d{2}:\d{2}:\d{2})/i)?.[1] ?? null;

  return {
    recipient,
    invoiceNo,
    series,
    totalValue,
    accessKey,
    natureOperation,
    cnpj,
    company,
    dateIssue,
    dateEntry,
    timeEntry,
  };
}
