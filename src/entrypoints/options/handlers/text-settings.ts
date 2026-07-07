import type { AppConfig } from '@/lib/default-config';
import { delegate, qs, qsa } from '@/lib/dom';
import { isBlacklistFilterKey, isBooleanConfigKey } from '../config-keys';
import {
    flashErr,
    flashOk,
    getPreviousInput,
    setDisplay,
    setInputValue,
    showElementError,
} from '../dom-effects';
import { downloadTextFile, exportFilename, findSectionTextarea, importIntoTextarea } from '../text-files';
import {
    bindShiftEnterSave,
    getTextSaveTargets,
    toggleChildBox,
} from './shared';

function normalizeBlacklistTextareaValue(textarea: HTMLTextAreaElement): string {
    let value = textarea.value.replace(/[\n\r]+/g, '|');
    if(value[value.length-1] === '|') value = value.slice(0,value.length-1);
    return value.length === 0 ? 'a^' : value;
}

function validateBlacklistValue(value: string, targets: Array<Element | null>): boolean {
    if (value === 'a^') return true;
    try {
        new RegExp(value);
        showElementError(targets);
        flashOk(targets);
        return true;
    }
    catch {
        flashErr(targets);
        return false;
    }
}

export function bindMinimizeLayoutHandlers(config: AppConfig, saveCurrentConfig: () => Promise<void>): void {
    setInputValue('.editText#input-layout-minimize', config.minimizeLayout_filter);
    delegate<HTMLElement>(document, 'click', '.saveText#button-layout-minimize', async function () {
        const element = getPreviousInput(this);
        if (!element) return;
        const value = element.value;
        if( value.length === 0 ) {
            config.minimizeLayout_filter = '.nothingElement';
            flashOk(element);
            await saveCurrentConfig();
            return;
        }

        element.style.color = 'inherit';
        flashOk(element);
        config.minimizeLayout_filter = value;
        await saveCurrentConfig();
    });
}

export function bindBlacklistHandlers(config: AppConfig, saveCurrentConfig: () => Promise<void>): void {
    delegate<HTMLInputElement>(document, 'click', 'input.saveText.blac', function () {
        qsa('.saveText.blac').forEach((button) => button.classList.remove('selected'));
        this.classList.add('selected');

        const index = this.getAttribute('index');
        qsa('.smallbox.blacklist').forEach((box) => setDisplay(box, false));
        if (index) qsa('.smallbox.blacklist.'+index).forEach((box) => setDisplay(box, true));
    });
    qs('.saveText.blac.nickname')?.click();

    delegate<HTMLButtonElement>(document, 'click', '.saveText.blacklist', async function () {
        const d = this.classList[2];
        if (!isBlacklistFilterKey(d)) return;
        const textarea = qs('textarea.blacklist.'+d);
        if (!(textarea instanceof HTMLTextAreaElement)) return;
        const value = normalizeBlacklistTextareaValue(textarea);
        const targets = getTextSaveTargets('.box.child.blacklist', textarea);
        if (!validateBlacklistValue(value, targets)) return;

        config.blacklist_filter[d] = value;
        await saveCurrentConfig();
        if (value === 'a^') flashOk(targets);
    });

    bindShiftEnterSave('textarea.blacklist', function (textarea) {
        return qs('.saveText.'+textarea.classList[1]+'.'+textarea.classList[2]);
    });
}

export function bindUserMemoHandlers(config: AppConfig, saveCurrentConfig: () => Promise<void>): void {
    delegate<HTMLElement>(document, 'click', '.saveText.userMemo.save', async function () {
        const textArea = qs<HTMLTextAreaElement>('.editText.userMemo');
        if (!textArea) return;
        const targets = getTextSaveTargets('.box.child.userMemo', textArea);
        showElementError(targets);
        flashOk(targets);
        config.userMemo_filter = textArea.value;
        await saveCurrentConfig();
    });

    bindShiftEnterSave('textarea.userMemo', function () {
        return qs('.saveText.userMemo.save');
    });
}

export function bindTextFileHandlers(): void {
    delegate<HTMLElement>(document, 'click', '.saveText.export', function () {
        const textarea = findSectionTextarea(this);
        if (!textarea) return;
        downloadTextFile(exportFilename(textarea), textarea.value);
    });

    delegate<HTMLElement>(document, 'click', '.saveText.import', function () {
        const textarea = findSectionTextarea(this);
        if (!textarea) return;
        importIntoTextarea(textarea);
    });
}

export function bindConfigToggleHandlers(config: AppConfig, saveCurrentConfig: () => Promise<void>): void {
    document.addEventListener('change', async function (event) {
        if (!(event.target instanceof HTMLInputElement) || !event.target.matches('.toggler')) return;
        const key = event.target.getAttribute('t');
        if (!isBooleanConfigKey(key)) return;
        const value = event.target.checked;

        config[key] = value;
        await saveCurrentConfig();
        toggleChildBox(event.target, value);
    });

    delegate<HTMLInputElement, KeyboardEvent>(document, 'keydown', 'input.editText', function (event) {
        if(event.key === 'Enter' && this.nextElementSibling instanceof HTMLElement) this.nextElementSibling.click();
    });
}
