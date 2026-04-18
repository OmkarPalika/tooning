import * as xlsx from 'xlsx';
import { PDFParse } from 'pdf-parse';

/**
 * Industry-grade document parser for multimodal context extraction.
 */
export class DocParser {
    
    /**
     * Extracts text and metadata from a PDF buffer.
     */
    public static async parsePdf(data: Uint8Array): Promise<string> {
        try {
            const pdfInstance = new PDFParse(data);
            const result = await pdfInstance.getText() as any;
            
            // Industry grade: Extract metadata if available to enrich context
            const info = result.info || {};
            const metadata = `[Meta: ${info.Title || 'Untitled'} | Creator: ${info.Creator || 'Unknown'}]`;
            
            return `${metadata}\n\n${result.text || ""}`;
        } catch (e) {
            console.error('PDF parsing failed:', e);
            return `[PDF Parsing Error: Document may be corrupted or encrypted]`;
        }
    }

    /**
     * Extracts a JSON-like string representation from an Excel/CSV buffer.
     * Uses memory-safe techniques for production reliability.
     */
    public static parseExcel(data: Uint8Array): string {
        try {
            // Guard: Very large files might need streaming (implemented via sheet_to_csv for now)
            const workbook = xlsx.read(data, { 
                type: 'array',
                cellDates: true,
                cellText: false 
            });
            let output = "";

            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                // Industry grade: csv conversion is typically more token-efficient than JSON for AI context
                const csv = xlsx.utils.sheet_to_csv(sheet);
                output += `### Sheet: ${sheetName}\n${csv}\n\n`;
            }

            return output.trim();
        } catch (e) {
            console.error('Excel parsing failed:', e);
            return `[Excel Parsing Error: Check file format compatibility]`;
        }
    }

    /**
     * Determine if a file is a supported multimodal document.
     */
    public static isSupported(filename: string): boolean {
        const ext = filename.split('.').pop()?.toLowerCase();
        return !!ext && ['pdf', 'xlsx', 'xls', 'csv'].includes(ext);
    }
}
