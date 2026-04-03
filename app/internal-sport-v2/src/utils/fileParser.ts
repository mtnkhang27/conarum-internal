/**
 * File Parser Utilities
 * Utilities for parsing CSV/JSON and downloading files
 */

/**
 * Parse CSV file content (semicolon-delimited)
 */
export function parseCSV(content: string): {
    headers: string[];
    rows: string[][];
} {
    const lines = content.split('\n').filter((line) => line.trim());
    if (lines.length === 0) {
        throw new Error('CSV file is empty');
    }

    const headers = lines[0].split(';').map((h) => h.trim());
    const rows = lines.slice(1).map((line) => line.split(';').map((cell) => cell.trim()));

    return { headers, rows };
}

/**
 * Parse JSON import file
 * Expected format: { "businessObject": "ASN", "data": [...] }
 */
export function parseJSONImport(content: string): {
    businessObject: string;
    data: Array<Record<string, unknown>>;
} {
    const parsed = JSON.parse(content);
    if (!parsed.data || !Array.isArray(parsed.data)) {
        throw new Error(
            'Invalid JSON format. Expected { "businessObject": "ASN", "data": [...] }'
        );
    }
    return parsed;
}

/**
 * Create downloadable CSV blob and trigger download
 */
export function downloadCSV(filename: string, content: string): void {
    const blob = new Blob([content + '\n'], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Convert string to base64
 */
export function toBase64(content: string): string {
    return btoa(unescape(encodeURIComponent(content)));
}

/**
 * Chunk array for batch processing
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}
