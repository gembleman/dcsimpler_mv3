import type { AppConfig } from '@/lib/default-config';
import type { VisitedGallery } from '@/lib/storage';
import { qs, qsa } from '@/lib/dom';
import { normalizeConfig } from '@/lib/storage';
import { isObjectRecord } from '@/lib/type-guards';
import { blacklistKeys, booleanConfigKeys, isBooleanConfigKey } from '../config-keys';
import { setDisplay, setInputValue, setTextareaValue, trigger } from '../dom-effects';
import type { OptionsCharts } from '../types';

export type BindOptionHandlersOptions = {
    config: AppConfig;
    charts: OptionsCharts;
    visitedGalleries: VisitedGallery[];
    saveCurrentConfig: () => Promise<void>;
};

export const stringConfigKeys = ['minimizeLayout_filter', 'userMemo_filter'] as const satisfies readonly (keyof AppConfig)[];

export function formatFilterText(value: string): string {
    return value === 'a^' ? '' : value.replace(/\|/g, '\r\n');
}

export function syncTextareaValue(selector: string, value: string): void {
    setTextareaValue(selector, value);
    trigger(qs(selector), 'input');
}

export function bindShiftEnterSave(
    textareaSelector: string,
    getSaveButton: (textarea: HTMLTextAreaElement) => HTMLElement | null | undefined,
): void {
    delegateTextareaKeydown(textareaSelector, function(event) {
        if(event.key !== 'Enter' || !event.shiftKey) return;
        getSaveButton(this)?.click();
        event.preventDefault();
        event.stopPropagation();
    });
}

function delegateTextareaKeydown(
    selector: string,
    handler: (this: HTMLTextAreaElement, event: KeyboardEvent) => void,
): void {
    document.addEventListener('keydown', function(event) {
        if (!(event.target instanceof HTMLTextAreaElement) || !event.target.matches(selector)) return;
        handler.call(event.target, event);
    });
}

export function getTextSaveTargets(boxSelector: string, textarea: HTMLTextAreaElement): Array<Element | null> {
    return [qs(boxSelector), textarea];
}

export function copyConfig(target: AppConfig, source: AppConfig): void {
    for (const key of booleanConfigKeys) target[key] = source[key];
    for (const key of stringConfigKeys) target[key] = source[key];
    for (const key of blacklistKeys) target.blacklist_filter[key] = source.blacklist_filter[key];
    target.blacklist_filter_by_gallery = {};
    for (const [gallId, filter] of Object.entries(source.blacklist_filter_by_gallery)) {
        target.blacklist_filter_by_gallery[gallId] = { ...filter };
    }
}

export function syncConfigControls(config: AppConfig): void {
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

export function parseImportedConfig(text: string): AppConfig | null {
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        return null;
    }

    if (!isObjectRecord(parsed) || Array.isArray(parsed)) return null;
    return normalizeConfig(parsed);
}

export function toggleChildBox(input: HTMLInputElement, visible: boolean): void {
    if(input.getAttribute('haveChildren') == null) return;
    const childBox = input.closest('.box')?.nextElementSibling;
    if (childBox instanceof HTMLElement) setDisplay(childBox, visible);
}
