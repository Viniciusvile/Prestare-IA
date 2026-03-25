import * as pdfjsLib from 'pdfjs-dist';

// Use the bundled worker from the package for better compatibility in Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export const extractTextFromPdf = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      // Use includeMarkedContent to capture text in complex digital signatures or registry docs
      const textContent = await page.getTextContent({ includeMarkedContent: true });
      
      // Be more inclusive with text items
      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .join(' ')
        .replace(/\s+/g, ' ') // Clean up extra spaces
        .trim();
        
      if (pageText) {
        fullText += pageText + '\n\n';
      }
    }
    
    return fullText;
  } catch (error) {
    console.error("Error in extractTextFromPdf:", error);
    throw error;
  }
};
