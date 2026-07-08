import type { AppConfig, BlacklistFilter, BlacklistFilterKey } from '@/lib/default-config';
import TLN from '@/lib/tln';
import { qs, qsa } from '@/lib/dom';
import { blacklistKeys, isBooleanConfigKey } from './config-keys';
import { setTextareaValue } from './dom-effects';
import { getScopedFilter } from './blacklist-scope';

function filterValueToText(value: string): string {
    return value === 'a^' ? '' : value.replace(/\|/g, '\r\n');
}

/** 주어진 필터 값을 4개 textarea에 채운다. 스코프 전환 시 재사용된다. */
export function loadFilterIntoTextareas(filter: BlacklistFilter): void {
    setTextareaValue('.editText.blacklist.id', filterValueToText(filter.id));
    setTextareaValue('.editText.blacklist.ip', filterValueToText(filter.ip));
    setTextareaValue('.editText.blacklist.nickname', filterValueToText(filter.nickname));
    setTextareaValue('.editText.blacklist.keyword', filterValueToText(filter.keyword));
    qsa<HTMLTextAreaElement>('.editText.blacklist').forEach(resizeTextareaToContent);
}

export function initBlacklist(config: AppConfig): void {
    loadFilterIntoTextareas(getScopedFilter(config));

    TLN.append_line_numbers('tln-blacklist-id');
    TLN.append_line_numbers('tln-blacklist-ip');
    TLN.append_line_numbers('tln-blacklist-nickname');
    TLN.append_line_numbers('tln-blacklist-keyword');

    qsa<HTMLTextAreaElement>('.editText.blacklist').forEach(growTextarea);
    qsa('.smallbox.blacklist:not(.nickname)').forEach((element) => element.style.display = 'none');
}

export function initUsermemo(config: AppConfig): void {
    const textarea = qs<HTMLTextAreaElement>('textarea.userMemo');
    if (!textarea) return;
    textarea.value = config.userMemo_filter;
    TLN.append_line_numbers('tln-userMemo');
    growTextarea(textarea);
    if (getComputedStyle(textarea).height === '0px') textarea.style.height = '72px';
}

export function initBootStrapButton(config: AppConfig): void {
    qsa<HTMLInputElement>('.toggler:not(.sub-option)').forEach(function (elem) {
        const key = elem.getAttribute('t');
        if (!isBooleanConfigKey(key)) return;
        const value = config[key];
        elem.checked = Boolean(value);

        if(elem.getAttribute('haveChildren') != null && elem.checked === false) {
            const childBox = elem.closest('.box')?.nextElementSibling;
            if (childBox instanceof HTMLElement) childBox.style.display = 'none';
        }
    });

    qsa('div[class^=menu-container]:not([index="0"])').forEach((element) => element.style.display = 'none');
}

export async function addUpdateNotification(version: string, innerText: string): Promise<void> {
    const { updateChk } = await chrome.storage.local.get('updateChk');
    if(!updateChk) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'update-notification upn-container';
    const title = document.createElement('div');
    title.className = 'upn-title';
    const titleIcon = document.createElement('i');
    titleIcon.className = 'fas fa-info-circle';
    titleIcon.style.marginRight = '10px';
    title.append(titleIcon, 'v.' + version + '_updatelog');
    const closeButton = document.createElement('div');
    closeButton.className = 'upn-close-button';
    const closeIcon = document.createElement('i');
    closeIcon.className = 'fas fa-times';
    closeIcon.id = 'close';
    closeButton.append(closeIcon);
    const detail = document.createElement('div');
    detail.className = 'upn-detail';
    detail.textContent = innerText;
    wrapper.append(title, closeButton, detail);
    document.body.append(wrapper);

    wrapper.addEventListener('click', async function (event) {
        wrapper.remove();
        await chrome.storage.local.set({ updateChk: false });
        const target = event.target instanceof Element ? event.target : null;
        if( target?.id !== 'close') qs('.item[index="5"]')?.click();
    });
}

export function addConfigFileControls(): void {
    const container = qs('.menu-container[index="0"]');
    if (!container || qs('.config-file-controls', container)) return;

    const box = document.createElement('div');
    box.className = 'box config-file-controls';

    const title = document.createElement('div');
    title.className = 'box-title';
    const heading = document.createElement('h2');
    heading.textContent = '설정 백업';
    const description = document.createElement('p');
    description.style.fontSize = '16px';
    description.textContent = '전체 설정을 JSON 파일로 관리합니다';
    title.append(heading, description);

    const buttonWrapper = document.createElement('div');
    buttonWrapper.className = 'button-wrapper';
    const exportButton = document.createElement('button');
    exportButton.className = 'saveText config-export color-blue';
    exportButton.type = 'button';
    exportButton.textContent = '내보내기';
    const importButton = document.createElement('button');
    importButton.className = 'saveText config-import color-blue';
    importButton.type = 'button';
    importButton.textContent = '가져오기';
    buttonWrapper.append(exportButton, importButton);

    box.append(title, buttonWrapper);
    container.append(box);
}

export async function loadUpdatelog(): Promise<void> {
    try {
        const response = await fetch('https://sites.google.com/view/dcsimpler/');
        const text = await response.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const main = doc.querySelector('div[role=main]');
        if (main) qs('#updatelog')?.append(main);
    }
    catch (e) {
    }
}

export function resizeTextareaToContent(elem: HTMLTextAreaElement | null): void {
    if (!elem) return;
    // 숨겨진(display:none) 요소는 scrollHeight가 0이라 높이가 0px로 축소된다.
    // 화면에 보일 때(탭 전환 시점 등)만 리사이즈해 잘림 버그를 막는다.
    if (elem.offsetParent === null) return;
    const offset = elem.offsetHeight - elem.clientHeight;
    const scrollRoot = document.scrollingElement ?? document.documentElement ?? document.body;
    const scrollLeft = window.pageXOffset || scrollRoot.scrollLeft;
    const scrollTop  = window.pageYOffset || scrollRoot.scrollTop;
    elem.style.height = 'auto';
    elem.style.height = (elem.scrollHeight + offset) + 'px';
    window.scrollTo(scrollLeft, scrollTop);
}

export function growTextarea(elem: HTMLTextAreaElement | null): void {
    if (!elem) return;
    elem.addEventListener('input', function() {
        resizeTextareaToContent(elem);
    });
    resizeTextareaToContent(elem);
}

export function testfield(config: AppConfig, obj: Record<BlacklistFilterKey, HTMLElement | null>): void {
    const filter = config.blacklist_filter;
    blacklistKeys.forEach(function (elem) {
        const target = obj[elem];
        if (!target) return;
        const frag = document.createDocumentFragment();
        const arr = filter[elem].split('|');
        const info = document.createElement('div');
        info.className = 'data-info';
        info.textContent = String(filter[elem].length);
        const info2 = document.createElement('div');
        info2.className = 'data-info2';
        info2.textContent = String(arr.length);
        frag.append(info, info2);
        arr.forEach(function (cuv: string) {
            const item = document.createElement('div');
            item.className = 'fragments';
            item.textContent = cuv + ' ';
            frag.append(item);
        });
        target.append(frag);
    });
}
