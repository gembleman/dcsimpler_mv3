import { insertAfter } from './common';
import { qsa } from './dom';
import { config } from './state';
import { isObjectRecord } from '../../lib/type-guards';
import { mergeVisitedGalleries } from '../../lib/storage';

interface GalleryItem {
    id: string;
    name: string;
    type: string;
    link: string;
}

function normalizeLink(href: string) {
    if (!href) return '';
    return String(href).replace(/^https?:\/\//, '').replace(/^\/\//, '');
}

function createHref(link: string) {
    if (!link) return '#';
    if (/^https?:\/\//.test(link) || link.startsWith('//')) return link;
    return '//'+link.replace(/^\/+/, '');
}

function normalizeGalleryItems(items: unknown): GalleryItem[] {
    const seen = new Set<string>();
    if (!Array.isArray(items)) return [];
    return items.map(function (elem) {
        if (!isObjectRecord(elem)) return null;
        const link = normalizeLink(String(elem.link ?? ''));
        const name = String(elem.name ?? '').trim();
        const id = String(elem.id ?? '');
        const type = String(elem.type ?? '');
        if (!link || !name || seen.has(link)) return null;
        seen.add(link);
        return { name, link, id, type };
    }).filter((elem): elem is GalleryItem => elem !== null);
}

function readDcinsideLatelyGalleryStore() {
    try {
        return JSON.parse(window.localStorage.getItem('lately_gallery') ?? '[]');
    } catch (e) {
        return [];
    }
}

function saveDcinsideLatelyGalleryStore(items: GalleryItem[]) {
    try {
        window.localStorage.setItem('lately_gallery', JSON.stringify(items.map(function (elem) {
            return { id: elem.id, name: elem.name, type: elem.type, link: elem.link };
        })));
    } catch (e) {
        /* 사이트 localStorage 사용 불가 시 무시 */
    }
}

function readStoredLatelyGallery() {
    return normalizeGalleryItems(readDcinsideLatelyGalleryStore());
}

function readDomLatelyGallery() {
    const items = qsa<HTMLElement>('#visit_history_lyr .under_listbox.vst_list li, #visit_history .newvisit_list.vst_listbox li');
    return normalizeGalleryItems(items.map(function (item) {
        const anchor = item.querySelector('a[href]');
        const button = item.querySelector('.btn_visit_del');
        return {
            link: anchor?.getAttribute('href') ?? '',
            name: anchor?.textContent ?? '',
            id: button?.getAttribute('data-id') ?? anchor?.getAttribute('section') ?? '',
            type: button?.getAttribute('data-gtype') ?? '',
        };
    }));
}

function readLatelyGallery() {
    return normalizeGalleryItems(readStoredLatelyGallery().concat(readDomLatelyGallery()));
}

// 방문 갤러리 목록을 옵션 페이지에서 쓸 수 있도록 chrome.storage에 미러링한다.
// 사이트 localStorage(lately_gallery)는 확장 컨텍스트에서 접근 불가하기 때문이다.
function mirrorVisitedGalleries(items: GalleryItem[]) {
    const galleries = items
        .filter((item) => item.id && item.name)
        .map((item) => ({ id: item.id, name: item.name }));
    if (galleries.length === 0) return;
    void mergeVisitedGalleries(galleries).catch(function () {
        /* storage 접근 실패 시 무시 */
    });
}

function findDeleteButton(elem: GalleryItem) {
    if (!elem?.id) return null;
    return qsa<HTMLElement>('#visit_history .btn_visit_del, #visit_history_lyr .btn_visit_del').find(function (button) {
        return button.getAttribute('data-id') === elem.id
            && (!elem.type || button.getAttribute('data-gtype') === elem.type);
    }) ?? null;
}

function createGalleryElements(latelyGalleries: GalleryItem[]) {
    const fragment = document.createDocumentFragment();
    if (!Array.isArray(latelyGalleries)) return fragment;
    latelyGalleries.forEach(function (elem, idx) {
        const wrapper = document.createElement('div');
        wrapper.setAttribute('index', String(idx));

        const anchor = document.createElement('a');
        anchor.href = createHref(elem.link);
        anchor.textContent = ' '+(elem.name ?? '')+' ';
        wrapper.append(anchor);

        const closeBox = document.createElement('div');
        closeBox.id = 'dcs_closebox';
        wrapper.append(closeBox);

        fragment.append(wrapper);
    });
    return fragment;
}

function renderGalleryElements(container: Element | DocumentFragment, latelyGalleries: GalleryItem[]) {
    container.replaceChildren(createGalleryElements(latelyGalleries));
}

function findMountTarget() {
    return document.querySelector('#login_box') ?? document.querySelector('.right_content > div') ?? document.querySelector('.right_content');
}

export function mountVisitHistory() {
    if (config.addRightSideVisitHistory === false) return false;
    let latelyGallery: GalleryItem[] = [];

    function mount() {
        latelyGallery = readLatelyGallery();
        mirrorVisitedGalleries(latelyGallery);
        const mountTarget = findMountTarget();
        if (!mountTarget) return false;
        document.querySelector('#dcs_visit_history')?.remove();
        const visitHistoryNode = document.createElement('div');
        visitHistoryNode.id = 'dcs_visit_history';
        renderGalleryElements(visitHistoryNode, latelyGallery);
        insertAfter(visitHistoryNode, mountTarget);
        visitHistoryNode.addEventListener('click', visitHistoryClickListener);
        return latelyGallery.length > 0;
    }

    function observeMount() {
        if (!document.body) return;
        const observer = new MutationObserver(function () {
            if (!findMountTarget() || readLatelyGallery().length === 0) return;
            observer.disconnect();
            mount();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(function () {
            observer.disconnect();
        }, 5000);
    }

    function visitHistoryClickListener(event: MouseEvent) {
        if (!(event.target instanceof HTMLElement) || event.target.id !== 'dcs_closebox') return false;
        const indexValue = event.target.parentElement?.getAttribute('index');
        if (indexValue == null) return false;
        const index = Number(indexValue);
        const removed = latelyGallery[index];
        if (!removed) return false;
        latelyGallery.splice(index, 1);
        saveDcinsideLatelyGalleryStore(latelyGallery);
        findDeleteButton(removed)?.click();
        const visitHistoryNode = document.querySelector('#dcs_visit_history');
        if (visitHistoryNode) renderGalleryElements(visitHistoryNode, latelyGallery);
    }

    if (!mount()) observeMount();
    return true;
}
