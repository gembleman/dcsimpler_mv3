import { flashOk, trigger } from './dom-effects';

function getTextFromFileReader(reader: FileReader): string | null {
    return typeof reader.result === 'string' ? reader.result : null;
}

function readFileText(file: File, onLoad: (text: string) => void): void {
    const reader = new FileReader();
    reader.onload = function () {
        const text = getTextFromFileReader(reader);
        if (text === null) {
            alert('텍스트 파일만 가져올 수 있습니다.');
            return;
        }
        onLoad(text);
    };
    reader.onerror = function () { alert('파일을 불러오지 못했습니다.'); };
    reader.readAsText(file);
}

export function normalizeImportedText(text: string): string {
    return text.replace(/\r\n/g, '\n');
}

export function findSectionTextarea(button: Element): HTMLTextAreaElement | null {
    const section = button.closest('.smallbox') || button.closest('.box.child');
    return section ? section.querySelector<HTMLTextAreaElement>('textarea') : null;
}

export function exportFilename(textarea: HTMLTextAreaElement): string {
    const classes = Array.from(textarea.classList).filter(function (c) { return c !== 'editText'; });
    const suffix = classes.length ? classes.join('-') : 'filter';
    return 'dcsimpler-' + suffix + '.txt';
}

export function downloadTextFile(filename: string, text: string): void {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export function importTextFile(onLoad: (text: string) => void): void {
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = '.txt,text/plain';
    picker.addEventListener('change', function () {
        const file = picker.files?.[0];
        if (!file) return;
        readFileText(file, onLoad);
    });
    picker.click();
}

export function importIntoTextarea(textarea: HTMLTextAreaElement): void {
    importTextFile(function (text) {
        textarea.value = normalizeImportedText(text);
        trigger(textarea, 'input');
        flashOk(textarea);
    });
}
