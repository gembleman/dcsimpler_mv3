import { fetching } from './common';
import { pageContext } from './context';
import { parseHtml, qsa } from './dom';
import { contentBlock, contentMemo } from './filters';
import { manipulateDOM } from './page-ui';
import { config } from './state';
import type { AppConfig } from '../../lib/default-config';

interface ListLoaderDependencies {
    loadArticleViaDialog: (url: string) => void | boolean;
}

let listLoaderDependencies: ListLoaderDependencies = { loadArticleViaDialog: () => false };

export function setListLoaderDependencies(dependencies: Partial<ListLoaderDependencies>) {
    listLoaderDependencies = { ...listLoaderDependencies, ...dependencies };
}

function keywordHighlighting() {
    let keywordElement = document.querySelector<HTMLInputElement>('input[type="hidden"][name="s_keyword"], input[name="s_keyword"]');
    let keyword = keywordElement ? keywordElement.value : undefined;
    if (keyword && keyword != '' && keyword != 'null') {
        qsa('.gall_tit').forEach(function(gallTitle){
            let anchor = gallTitle.querySelector('a:first-child');
            if (!anchor) return;
            highlightKeyword(anchor, keyword);
        });
    }
}

function highlightKeyword(anchor: Element, keyword: string): void {
    const walker = document.createTreeWalker(anchor, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            if (parent.closest('.icon_img, .mark')) return NodeFilter.FILTER_REJECT;
            return node.nodeValue?.includes(keyword) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        },
    });
    const textNode = walker.nextNode();
    if (!(textNode instanceof Text) || !textNode.nodeValue) return;
    const start = textNode.nodeValue.indexOf(keyword);
    if (start === -1) return;
    const before = textNode.nodeValue.slice(0, start);
    const matched = textNode.nodeValue.slice(start, start + keyword.length);
    const after = textNode.nodeValue.slice(start + keyword.length);
    const mark = document.createElement('span');
    mark.className = 'mark';
    mark.textContent = matched;
    textNode.replaceWith(document.createTextNode(before), mark, document.createTextNode(after));
}

interface FetchController {
    controller: AbortController | null;
    signal: AbortSignal | null;
}

const lc: FetchController = {
    controller: null,
    signal: null,
};

function abortPreviousFetch(fetchController: FetchController): void {
    if (fetchController.controller) fetchController.controller.abort();
    fetchController.controller = new AbortController();
    fetchController.signal = fetchController.controller.signal;
}

async function fetchListDocument(requestURL: string, fetchController: FetchController): Promise<Document> {
    const res = await fetching(requestURL, fetchController);
    if (!res.ok) throw new Error(String(res.status));
    return parseHtml(await res.text());
}

function getReplacementList(listDocument: Document): Element | null {
    const newList = listDocument.querySelector('.gall_list');
    if (!newList) return null;
    const clonedList = newList.cloneNode(true) as Element;
    clonedList.classList.add('onload');
    return clonedList;
}

function getReplacementPagination(listDocument: Document): Element | null {
    const pagination = listDocument.querySelectorAll('.bottom_paging_box')[1]?.cloneNode(true);
    return pagination instanceof Element ? pagination : null;
}

function patchPagination(paging: Element, newPagination: Element): void {
    paging.replaceChildren(...Array.from(newPagination.childNodes).map((node) => node.cloneNode(true)));
    qsa('a', paging).forEach((anchor) => {
        anchor.setAttribute('onclick', 'return false;');
        anchor.setAttribute('class', 'dcs_pagenationChild');
    });
}

function replaceList(listDocument: Document): void {
    const newList = getReplacementList(listDocument);
    const newPagination = getReplacementPagination(listDocument);
    const leftContent = document.querySelector('.left_content');
    const wrap = leftContent?.querySelector('.wrapGL');
    if (!leftContent || !wrap || !newList) return;

    leftContent.querySelectorAll('head').forEach((head) => head.remove());
    wrap.replaceChildren(newList);
    const paging = leftContent.querySelectorAll('.bottom_paging_box')[0];
    if (paging && newPagination) patchPagination(paging, newPagination);
}

function bindArticleLinks(context: typeof pageContext, appConfig: AppConfig): void {
    qsa<HTMLAnchorElement>('.left_content .ub-content .gall_tit a').forEach(function (anchor) {
        anchor.setAttribute('onclick', 'return false;');
        anchor.addEventListener('click', function (this: HTMLAnchorElement, evt) {
            this.blur();
            const clickedIcon = evt.target instanceof Element && evt.target.classList[0] === 'icon_img';
            const href = this.getAttribute('href');
            if (!href) return;
            if (clickedIcon || !context.lists) window.location.href = href;
            else appConfig.directView === true ? listLoaderDependencies.loadArticleViaDialog(href) : window.location.href = href;
        });
    });
}

function applyListFilters(): void {
    contentBlock.toContent();
    contentMemo.toContent();
}

export let loadList = async function (requestURL?: string) {
    manipulateDOM.setProgress(0);
    abortPreviousFetch(lc);
    const resolvedRequestURL = requestURL ?? location.href;
    try {
        const listDocument = await fetchListDocument(resolvedRequestURL, lc);
        manipulateDOM.setProgress(1);
        history.replaceState({data: 'getLists'}, 'title', resolvedRequestURL);
        replaceList(listDocument);
        applyListFilters();
        bindArticleLinks(pageContext, config);
        if(pageContext.query['s_keyword']) keywordHighlighting();
    } catch (error) {
        console.warn(error);
        manipulateDOM.setProgress(-2);
    }
}
