import type { AppConfig, BlacklistFilterKey } from '@/lib/default-config';
import TLN from '@/lib/tln';
import { qs, qsa } from '@/lib/dom';
import { blacklistKeys, isBooleanConfigKey } from './config-keys';
import { setText, setTextareaValue } from './dom-effects';

export function initBlacklist(config: AppConfig): void {
    let id = config.blacklist_filter.id;
    let ip = config.blacklist_filter.ip;
    let nickname = config.blacklist_filter.nickname;
    let keyword = config.blacklist_filter.keyword;

    ip = ip == 'a^'? '' : ip.replace(/\|/g,'\r\n');
    id = id == 'a^'? '' : id.replace(/\|/g,'\r\n');
    nickname = nickname == 'a^'? '' : nickname.replace(/\|/g,'\r\n');
    keyword = keyword == 'a^'? '' : keyword.replace(/\|/g,'\r\n');

    setTextareaValue('.editText.blacklist.id', id);
    setTextareaValue('.editText.blacklist.ip', ip);
    setTextareaValue('.editText.blacklist.nickname', nickname);
    setTextareaValue('.editText.blacklist.keyword', keyword);

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
    wrapper.innerHTML = '<div class="upn-title"><i class="fas fa-info-circle" style="margin-right: 10px"></i>v.'+version+'_updatelog</div>' +
        '<div class="upn-close-button"><i class="fas fa-times" id="close"></i></div>' +
        '<div class="upn-detail">'+innerText+'</div>';
    document.body.append(wrapper);

    wrapper.addEventListener('click', async function (event) {
        wrapper.remove();
        await chrome.storage.local.set({ updateChk: false });
        const target = event.target instanceof Element ? event.target : null;
        if( target?.id !== 'close') qs('.item[index="5"]')?.click();
    });
}

export function addFootprint(version: string): void {
    document.body.insertAdjacentHTML('beforeend', '<div id="footPrint">dcsimpler | '+version+'</div>');
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

export function growTextarea(elem: HTMLTextAreaElement | null): void {
    if (!elem) return;
    const offset = elem.offsetHeight - elem.clientHeight;
    const resizeTextarea = function(element: HTMLTextAreaElement): void {
        const scrollRoot = document.scrollingElement ?? document.documentElement ?? document.body;
        const scrollLeft = window.pageXOffset || scrollRoot.scrollLeft;
        const scrollTop  = window.pageYOffset || scrollRoot.scrollTop;
        element.style.height = 'auto';
        element.style.height = (element.scrollHeight + offset) + 'px';
        window.scrollTo(scrollLeft, scrollTop);
    };
    elem.addEventListener('input', function() {
        resizeTextarea(elem);
    });
    resizeTextarea(elem);
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
