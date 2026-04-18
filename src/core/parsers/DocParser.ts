import * as xlsx from 'xlsx';
import pdfParse from 'pdf-parse';

export class DocParser {
    
    /**
     * Extracts text from a PDF buffer.
     */
    public static async parsePdf(data: Uint8Array): Promise<string> {
        try {
            // Buffer.from is safe in Node and VS Code environment
            const buffer = Buffer.from(data);
            const result = await pdfParse(buffer);
            return result.text || "";
        } catch (e) {
            console.error('PDF parsing failed:', e);
            return `[PDF Parsing Error]`;
        }
    }

    /**
     * Extracts a JSON-like string representation from an Excel/CSV buffer.
     */
    public static parseExcel(data: Uint8Array): string {
        try {
            const workbook = xlsx.read(data, { type: 'array' });
            let output = "";

            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                const csv = xlsx.utils.sheet_to_csv(sheet);
                output += `Sheet: ${sheetName}\n${csv}\n\n`;
            }

            return output.trim();
        } catch (e) {
            console.error('Excel parsing failed:', e);
            return `[Excel Parsing Error]`;
        }
    }

    /**
     * Helper to determine if a file is a supported multimodal document.
     */
    public static isSupported(filename: string): boolean {
        const ext = filename.split('.').pop()?.toLowerCase();
        return !!ext && ['pdf', 'xlsx', 'xls', 'csv'].includes(ext);
    }
}
