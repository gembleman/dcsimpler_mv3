import type { AppConfig } from '@/lib/default-config';
import { clearHistory } from '@/lib/stats';
import { delegate, qs, qsa } from '@/lib/dom';
import { isBlacklistFilterKey, isBooleanConfigKey } from './config-keys';
import {
    flashErr,
    flashOk,
    getFileInput,
    getFileReader,
    getPreviousInput,
    setDisplay,
    setInputValue,
    setText,
    showElementError,
} from './dom-effects';
import { exportFilename, downloadTextFile, findSectionTextarea, importIntoTextarea } from './text-files';
import { getImageDataFromReader } from './image-data';
import { recreateCharts } from './charts';
import type { OptionsCharts } from './types';

type BindOptionHandlersOptions = {
    config: AppConfig;
    charts: OptionsCharts;
    saveCurrentConfig: () => Promise<void>;
};

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
        let value = textarea.value;
        const element = [qs('.box.child.blacklist'), textarea];
        value = value.replace(/[\n\r]+/g, '|');
        if(value[value.length-1] === '|') value = value.slice(0,value.length-1);

        if( value.length === 0 ) {
            config.blacklist_filter[d] = 'a^';
            await saveCurrentConfig();
            flashOk(element);
            return;
        }
        try {
            new RegExp(value);
            showElementError(element);
            flashOk(element);
        }
        catch (e) {
            flashErr(element);
            return;
        }

        config.blacklist_filter[d] = value;
        await saveCurrentConfig();
    });

    delegate<HTMLTextAreaElement, KeyboardEvent>(document, 'keydown', 'textarea.blacklist', function(event){
        if(event.key === 'Enter' && event.shiftKey){
            qs('.saveText.'+this.classList[1]+'.'+this.classList[2])?.click();
            event.preventDefault();
            event.stopPropagation();
        }
    });
}

function bindUserMemoHandlers(config: AppConfig, saveCurrentConfig: () => Promise<void>): void {
    delegate<HTMLElement>(document, 'click', '.saveText.userMemo.save', async function () {
        const textArea = qs<HTMLTextAreaElement>('.editText.userMemo');
        if (!textArea) return;
        const targets = [qs('.box.child.userMemo'), textArea];
        showElementError(targets);
        flashOk(targets);
        config.userMemo_filter = textArea.value;
        await saveCurrentConfig();
    });

    delegate<HTMLTextAreaElement, KeyboardEvent>(document, 'keydown', 'textarea.userMemo', function(event){
        if(event.key === 'Enter' && event.shiftKey){
            qs('.saveText.userMemo.save')?.click();
            event.preventDefault();
            event.stopPropagation();
        }
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
    bindConfigToggleHandlers(options.config, options.saveCurrentConfig);
    bindImageUploadHandlers();
    bindStatsHandlers(options.charts);
}
