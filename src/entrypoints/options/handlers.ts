import type { AppConfig } from '@/lib/default-config';
import { clearHistory } from '@/lib/stats';
import { normalizeConfig } from '@/lib/storage';
import { isObjectRecord } from '@/lib/type-guards';
import { delegate, qs, qsa } from '@/lib/dom';
import { blacklistKeys, booleanConfigKeys, isBlacklistFilterKey, isBooleanConfigKey } from './config-keys';
import {
    flashErr,
    flashOk,
    getFileInput,
    getFileReader,
    getPreviousInput,
    setDisplay,
    setInputValue,
    setTextareaValue,
    setText,
    showElementError,
    trigger,
} from './dom-effects';
import { exportFilename, downloadTextFile, findSectionTextarea, importIntoTextarea, importTextFile } from './text-files';
import { getImageDataFromReader } from './image-data';
import { recreateCharts } from './charts';
import type { OptionsCharts } from './types';

type BindOptionHandlersOptions = {
    config: AppConfig;
    charts: OptionsCharts;
    saveCurrentConfig: () => Promise<void>;
};

const stringConfigKeys = ['minimizeLayout_filter', 'userMemo_filter'] as const satisfies readonly (keyof AppConfig)[];

function formatFilterText(value: string): string {
    return value === 'a^' ? '' : value.replace(/\|/g, '\r\n');
}

function syncTextareaValue(selector: string, value: string): void {
    setTextareaValue(selector, value);
    trigger(qs(selector), 'input');
}

function bindShiftEnterSave(
    textareaSelector: string,
    getSaveButton: (textarea: HTMLTextAreaElement) => HTMLElement | null | undefined,
): void {
    delegate<HTMLTextAreaElement, KeyboardEvent>(document, 'keydown', textareaSelector, function(event){
        if(event.key !== 'Enter' || !event.shiftKey) return;
        getSaveButton(this)?.click();
        event.preventDefault();
        event.stopPropagation();
    });
}

function normalizeBlacklistTextareaValue(textarea: HTMLTextAreaElement): string {
    let value = textarea.value.replace(/[\n\r]+/g, '|');
    if(value[value.length-1] === '|') value = value.slice(0,value.length-1);
    return value.length === 0 ? 'a^' : value;
}

function getTextSaveTargets(boxSelector: string, textarea: HTMLTextAreaElement) {
    return [qs(boxSelector), textarea];
}

function validateBlacklistValue(value: string, targets: Array<Element | null>): boolean {
    if (value === 'a^') return true;
    try {
        new RegExp(value);
        showElementError(targets);
        flashOk(targets);
        return true;
    }
    catch (e) {
        flashErr(targets);
        return false;
    }
}

function copyConfig(target: AppConfig, source: AppConfig): void {
    for (const key of booleanConfigKeys) target[key] = source[key];
    for (const key of stringConfigKeys) target[key] = source[key];
    for (const key of blacklistKeys) target.blacklist_filter[key] = source.blacklist_filter[key];
}

function syncConfigControls(config: AppConfig): void {
    qsa<HTMLInputElement>('.toggler').forEach(function (input) {
        const key = input.getAttribute('t');
        if (!isBooleanConfigKey(key)) return;
        input.checked = config[key];

        if(input.getAttribute('haveChildren') != null) {
            const childBox = input.closest('.box')?.nextElementSibling;
            if (childBox instanceof HTMLElement) childBox.style.display = input.checked ? '' : 'none';
        }
    });

    setInputValue('.editText#input-layout-minimize', config.minimizeLayout_filter);
    syncTextareaValue('.editText.userMemo', config.userMemo_filter);
    for (const key of blacklistKeys) {
        syncTextareaValue('.editText.blacklist.' + key, formatFilterText(config.blacklist_filter[key]));
    }
}

function parseImportedConfig(text: string): AppConfig | null {
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        return null;
    }

    if (!isObjectRecord(parsed) || Array.isArray(parsed)) return null;
    return normalizeConfig(parsed);
}

function bindMenuHandlers(): void {
    delegate(document, 'click', '.item', function () {
        const index = this.getAttribute('index');
        if(this.getAttribute('pageMove') != null) {window.open('https://chrome.google.com/webstore/detail/dcsimpler/kgpiejjjpjkcijopeabfleliifbhfnci?hl=ko'); return;}

        qsa('.item').forEach((item) => item.classList.toggle('clicked', item.getAttribute('index') === index));
        qsa('.menu-container').forEach((container) => setDisplay(container, container.getAttribute('index') === index));
    });
}

function bindMinimizeLayoutHandlers(config: AppConfig, saveCurrentConfig: () => Promise<void>): void {
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

function bindBlacklistHandlers(config: AppConfig, saveCurrentConfig: () => Promise<void>): void {
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

function bindUserMemoHandlers(config: AppConfig, saveCurrentConfig: () => Promise<void>): void {
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

function bindTextFileHandlers(): void {
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

function bindConfigFileHandlers(config: AppConfig, saveCurrentConfig: () => Promise<void>): void {
    delegate<HTMLButtonElement>(document, 'click', '.saveText.config-export', function () {
        downloadTextFile('dcsimpler-config.json', JSON.stringify(normalizeConfig(config), null, 2), 'application/json;charset=utf-8');
    });

    delegate<HTMLButtonElement>(document, 'click', '.saveText.config-import', function () {
        const button = this;
        importTextFile(async function (text) {
            const importedConfig = parseImportedConfig(text);
            if (!importedConfig) {
                alert('설정 JSON 파일을 읽지 못했습니다.');
                return;
            }

            copyConfig(config, importedConfig);
            syncConfigControls(config);
            await saveCurrentConfig();
            flashOk(button);
        }, '.json,application/json');
    });
}

function bindConfigToggleHandlers(config: AppConfig, saveCurrentConfig: () => Promise<void>): void {
    document.addEventListener('change', async function (event) {
        if (!(event.target instanceof HTMLInputElement) || !event.target.matches('.toggler')) return;
        const key = event.target.getAttribute('t');
        if (!isBooleanConfigKey(key)) return;
        const value = event.target.checked;

        config[key] = value;
        await saveCurrentConfig();

        if(event.target.getAttribute('haveChildren') != null) {
            const childBox = event.target.closest('.box')?.nextElementSibling;
            if (childBox instanceof HTMLElement) childBox.style.display = value ? '' : 'none';
        }
    });

    delegate<HTMLInputElement, KeyboardEvent>(document, 'keydown', 'input.editText', function (event) {
        if(event.key === 'Enter' && this.nextElementSibling instanceof HTMLElement) this.nextElementSibling.click();
    });
}

function bindImageUploadHandlers(): void {
    qs('.upload-image-delegator')?.addEventListener('click', function () { qs('#upload-image')?.click(); });
    qs('.upload-image-deletor')?.addEventListener('click', async function () {
        await chrome.storage.local.set({ autoInsertImageData: {} });
        setText('.image-name', '설정된 이미지 파일이 없습니다');
    });

    qs('#upload-image')?.addEventListener('change', function (event) {
        const input = getFileInput(event);
        const file = input?.files?.[0];
        if (!file) return;
        const MAX_IMAGE_BYTES = 7 * 1024 * 1024;
        if (file.size > MAX_IMAGE_BYTES) {
            alert('이미지 용량이 너무 큽니다. 7MB 이하 파일을 사용해주세요.');
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async function(event: ProgressEvent<FileReader>) {
            const fileReader = getFileReader(event);
            const imageData = fileReader ? getImageDataFromReader(fileReader, file) : null;
            if (!imageData) {
                alert('이미지를 불러오지 못했습니다.');
                return;
            }
            try {
                await chrome.storage.local.set({ autoInsertImageData: imageData });
                setText('.image-name', file.name);
            } catch (e) {
                console.error(e);
                alert('이미지를 저장하지 못했습니다. 파일 용량을 줄여 다시 시도해주세요.');
            }
        };
        reader.readAsDataURL(file);
    });
}

function bindStatsHandlers(charts: OptionsCharts): void {
    const refreshCharts = async function () {
        await recreateCharts(charts);
    };

    delegate(document, 'click', '#so-clear', async function () {
        const confirmWindow = confirm('기록을 삭제하시겠습니까?');
        if (confirmWindow) {
            await clearHistory(30);
            await refreshCharts();
        }
    });

    delegate(document, 'click', '#so-refresh', refreshCharts);
}

export function bindOptionHandlers(options: BindOptionHandlersOptions): void {
    bindMenuHandlers();
    bindMinimizeLayoutHandlers(options.config, options.saveCurrentConfig);
    bindBlacklistHandlers(options.config, options.saveCurrentConfig);
    bindUserMemoHandlers(options.config, options.saveCurrentConfig);
    bindTextFileHandlers();
    bindConfigFileHandlers(options.config, options.saveCurrentConfig);
    bindConfigToggleHandlers(options.config, options.saveCurrentConfig);
    bindImageUploadHandlers();
    bindStatsHandlers(options.charts);
}
