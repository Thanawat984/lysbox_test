import Tesseract from "tesseract.js";
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
export async function extractTextFromImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);

    Tesseract.recognize(imageUrl, "por")
      .then(({ data: { text } }) => {
        URL.revokeObjectURL(imageUrl); // cleanup
        resolve(text);
      })
      .catch(reject);
  });
}

export async function extractTextFromPDF(file: File): Promise<string> {
  const fileData = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: fileData }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    fullText += " " + pageText;
  }
  return fullText;
}

export async function extractTextFromXML(file: File): Promise<string> {
  const text = await file.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, "application/xml");

  // Example: extract due_date, period, and CNPJ if present
  const dueDate = xmlDoc.querySelector("due_date")?.textContent ?? "";
  const period = xmlDoc.querySelector("period")?.textContent ?? "";
  const cnpj = xmlDoc.querySelector("CNPJ")?.textContent ?? "";

  return `Due Date: ${dueDate}, Period: ${period}, CNPJ: ${cnpj}`;
}
