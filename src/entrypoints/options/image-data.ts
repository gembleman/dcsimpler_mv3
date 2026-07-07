import type { AutoInsertImageData } from './types';

export function isAutoInsertImageData(value: unknown): value is AutoInsertImageData {
    if (typeof value !== 'object' || value === null) return false;
    const record = value as Record<string, unknown>;
    return (record.filebyte === undefined || typeof record.filebyte === 'string')
        && (record.filetype === undefined || typeof record.filetype === 'string')
        && (record.filename === undefined || typeof record.filename === 'string');
}

export function getImageDataFromReader(reader: FileReader, file: File): AutoInsertImageData | null {
    const result = reader.result;
    if (typeof result !== 'string') return null;
    return {
        filebyte: result,
        filetype: file.type,
        filename: file.name
    };
}
