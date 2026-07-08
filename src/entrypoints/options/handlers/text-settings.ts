import type { AppConfig } from '@/lib/default-config';
import type { VisitedGallery } from '@/lib/storage';
import { delegate, qs, qsa } from '@/lib/dom';
import { isBlacklistFilterKey, isBooleanConfigKey } from '../config-keys';
import {
    getCurrentScope,
    getScopedFilter,
    normalizeGalleryId,
    pruneEmptyScope,
    renderScopeSelect,
    setCurrentScope,
} from '../blacklist-scope';
import { loadFilterIntoTextareas, resizeTextareaToContent } from '../sections';
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

export function bindBlacklistHandlers(
    config: AppConfig,
    saveCurrentConfig: () => Promise<void>,
    visited: VisitedGallery[],
): void {
    delegate<HTMLInputElement>(document, 'click', 'input.saveText.blac', function () {
        qsa('.saveText.blac').forEach((button) => button.classList.remove('selected'));
        this.classList.add('selected');

        const index = this.getAttribute('index');
        qsa('.smallbox.blacklist').forEach((box) => setDisplay(box, false));
        if (index) qsa('.smallbox.blacklist.'+index).forEach((box) => setDisplay(box, true));
        // 방금 보이게 된 textarea는 숨겨져 있던 동안 높이가 축소됐을 수 있어 다시 맞춘다.
        if (index) resizeTextareaToContent(qs<HTMLTextAreaElement>('textarea.blacklist.'+index));
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

        const scope = getCurrentScope();
        getScopedFilter(config)[d] = value;
        // 갤러리 스코프에서 모든 필터가 비워지면 저장소에서 제거하고 드롭다운 표시(● 마커)를 갱신한다.
        if (scope !== '') {
            pruneEmptyScope(config, scope);
            renderScopeSelect(config, visited);
            const select = qs<HTMLSelectElement>('.blacklist-scope-select');
            if (select) select.value = scope;
        }
        await saveCurrentConfig();
        if (value === 'a^') flashOk(targets);
    });

    bindShiftEnterSave('textarea.blacklist', function (textarea) {
        return qs('.saveText.'+textarea.classList[1]+'.'+textarea.classList[2]);
    });
}

/** 차단 적용 범위(전체/갤러리별) 전환 UI를 바인딩한다. */
export function bindBlacklistScopeHandlers(
    config: AppConfig,
    saveCurrentConfig: () => Promise<void>,
    visited: VisitedGallery[],
): void {
    const select = qs<HTMLSelectElement>('.blacklist-scope-select');
    const input = qs<HTMLInputElement>('.blacklist-scope-input');
    const removeButton = qs<HTMLButtonElement>('.blacklist-scope-remove');

    renderScopeSelect(config, visited);
    updateRemoveButton();

    function updateRemoveButton(): void {
        if (removeButton) setDisplay(removeButton, getCurrentScope() !== '');
    }

    // 현재 스코프의 필터를 textarea에 로드하고 삭제 버튼 표시를 갱신한다.
    function applyScope(scope: string): void {
        setCurrentScope(scope);
        loadFilterIntoTextareas(getScopedFilter(config));
        if (select) select.value = scope;
        updateRemoveButton();
    }

    select?.addEventListener('change', function () {
        applyScope(this.value);
    });

    delegate<HTMLElement>(document, 'click', '.blacklist-scope-add', async function () {
        if (!input) return;
        const gallId = normalizeGalleryId(input.value);
        if (!gallId) {
            flashErr(input);
            return;
        }
        input.value = '';
        // 필터가 없던 갤러리라면 빈 필터로 등록하고, 저장/드롭다운에 반영한다.
        getScopedFilter(config, gallId);
        await saveCurrentConfig();
        renderScopeSelect(config, visited);
        applyScope(gallId);
        flashOk(input);
    });

    delegate<HTMLElement>(document, 'click', '.blacklist-scope-remove', async function () {
        const scope = getCurrentScope();
        if (scope === '') return;
        delete config.blacklist_filter_by_gallery[scope];
        await saveCurrentConfig();
        renderScopeSelect(config, visited);
        applyScope('');
        flashOk(this);
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
