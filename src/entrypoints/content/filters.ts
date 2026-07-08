import type { AppConfig, BlacklistFilter, BlacklistFilterKey } from '../../lib/default-config';
import { pageContext } from './context';
import { qsa, setElementVisibility } from './dom';
import { config, filter, type CompiledBlacklistFilter, type UserMemoFilter } from './state';

export type UserMemoInput = {
    ip: string[];
    tag: string[];
};

type WriterInfo = {
    ip: string | null;
    id: string | null;
    nickname: string | null;
    text: string | undefined;
};

type BlockReason = BlacklistFilterKey | 'notice';

type ContentNoticeInfo = {
    enabled: boolean;
    isOperator: boolean;
    isNoticeNumber: boolean;
    isNoticeSubject: boolean;
};

export function blacklistRegExp(key: BlacklistFilterKey, blacklist: Partial<CompiledBlacklistFilter> = filter.blacklist): RegExp {
    return blacklist[key] ?? /a^/;
}

export function extractWriterInfo(writer: Element, word?: HTMLElement | null): WriterInfo {
    return {
        ip: writer.getAttribute('data-ip'),
        id: writer.getAttribute('data-uid'),
        nickname: writer.getAttribute('data-nick'),
        text: word ? word.innerText : undefined,
    };
}

function valueMatchesBlacklist(value: string | null | undefined, key: BlacklistFilterKey, blacklist: Partial<CompiledBlacklistFilter>): boolean {
    return value !== undefined && value !== null && value.match(blacklistRegExp(key, blacklist)) !== null;
}

export function findBlockReason(
    writer: WriterInfo,
    blacklist: Partial<CompiledBlacklistFilter> = filter.blacklist,
    noticeInfo?: ContentNoticeInfo,
): BlockReason | undefined {
    if (noticeInfo?.enabled && (noticeInfo.isOperator || noticeInfo.isNoticeNumber || noticeInfo.isNoticeSubject)) return 'notice';
    if (valueMatchesBlacklist(writer.ip, 'ip', blacklist)) return 'ip';
    if (valueMatchesBlacklist(writer.id, 'id', blacklist)) return 'id';
    if (valueMatchesBlacklist(writer.nickname, 'nickname', blacklist)) return 'nickname';
    if (valueMatchesBlacklist(writer.text, 'keyword', blacklist)) return 'keyword';
    if (!noticeInfo && writer.nickname === '댓글돌이') return 'notice';
    return undefined;
}

function getContentNoticeInfo(article: HTMLElement, word: HTMLElement): ContentNoticeInfo {
    const gallNum = article.querySelector('.gall_num');
    const gallSubject = article.querySelector('.gall_subject');
    const isCurrentArticle = !gallNum || gallNum.querySelector('.sp_img.crt_icon') === null;
    return {
        enabled: config.blacklist_notice === true,
        isOperator: word.getAttribute('user_name') === '운영자',
        isNoticeNumber: !!gallNum && (gallNum.textContent ?? '').trim().match(/^[^0-9]{1,}$/) !== null && isCurrentArticle,
        isNoticeSubject: !!gallSubject && (gallSubject.textContent ?? '').match(/공지|뉴스|설문|AD/) !== null,
    };
}

function applyBlock(element: HTMLElement, reason: BlockReason, effect?: string) {
    element.setAttribute('blackedUser', 'qvz');
    element.setAttribute('contentBlockReason', reason);
    contentBlock.toggleContentDisplay(element, effect);
}

const BLOCKED_KEYWORD_CLASS = 'dcs-blocked-keyword';

// 제목 요소의 텍스트 노드에서 차단 키워드와 매칭되는 부분을 <span>으로 감싸 강조한다.
// 자식 요소(링크·아이콘)를 건드리지 않도록 텍스트 노드만 순회한다.
function highlightBlockedKeyword(titleElement: HTMLElement, keywordRegExp: RegExp): void {
    if (titleElement.querySelector('.' + BLOCKED_KEYWORD_CLASS)) return; // 이미 처리됨
    const walker = document.createTreeWalker(titleElement, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let current = walker.nextNode();
    while (current) {
        if (current.nodeValue && current.nodeValue.trim()) textNodes.push(current as Text);
        current = walker.nextNode();
    }

    for (const textNode of textNodes) {
        const text = textNode.nodeValue ?? '';
        const source = new RegExp(keywordRegExp.source, keywordRegExp.flags.includes('g') ? keywordRegExp.flags : keywordRegExp.flags + 'g');
        let match: RegExpExecArray | null;
        let lastIndex = 0;
        const fragment = document.createDocumentFragment();
        let matched = false;
        while ((match = source.exec(text)) !== null) {
            if (match[0].length === 0) { source.lastIndex++; continue; } // 빈 매칭 무한루프 방지
            matched = true;
            if (match.index > lastIndex) fragment.append(text.slice(lastIndex, match.index));
            const span = document.createElement('span');
            span.className = BLOCKED_KEYWORD_CLASS;
            span.textContent = match[0];
            fragment.append(span);
            lastIndex = match.index + match[0].length;
        }
        if (!matched) continue;
        if (lastIndex < text.length) fragment.append(text.slice(lastIndex));
        textNode.parentNode?.replaceChild(fragment, textNode);
    }
}

function findMemoTag(ip: string | null, usermemo: UserMemoFilter): string | undefined {
    if (!ip) return undefined;
    const match = usermemo.ip.indexOf(ip);
    return match === -1 ? undefined : usermemo.tag[match];
}

export function applyMemoTag(writer: Element, ip: string, tag: string): void {
    writer.setAttribute('title', ip);
    const ipElement = writer.querySelector('.ip');
    if (ipElement) ipElement.textContent = '('+tag+')';
}

function getCommentRoot(): ParentNode | null {
    const iframe = document.querySelector<HTMLIFrameElement>('#dcs_iframe');
    if (pageContext.calltype === 'lists' && !iframe) return null;
    return pageContext.calltype === 'lists' ? iframe?.contentWindow?.document.body ?? null : document.body;
}

function getCommentMemoRoot(): Document {
    const iframe = document.querySelector<HTMLIFrameElement>('#dcs_iframe');
    return pageContext.calltype == 'lists' && iframe?.contentWindow ? iframe.contentWindow.document : document;
}

const BLACKLIST_KEYS: readonly BlacklistFilterKey[] = ['id', 'ip', 'nickname', 'keyword'];

// 아무것도 매칭하지 않는 빈 필터 값. 병합 시 무시 대상이다.
const EMPTY_FILTER = 'a^';

// 전역 필터와 특정 갤러리 필터를 키별로 `|`로 병합한다.
// 두 값이 모두 비어 있으면 EMPTY_FILTER를, 하나만 있으면 그 값을, 둘 다 있으면 합집합을 만든다.
function mergeBlacklistFilter(global: BlacklistFilter, gallery?: BlacklistFilter): BlacklistFilter {
    if (!gallery) return { ...global };
    const merged = {} as BlacklistFilter;
    BLACKLIST_KEYS.forEach((key) => {
        const parts = [global[key], gallery[key]].filter((value) => value && value !== EMPTY_FILTER);
        merged[key] = parts.length === 0 ? EMPTY_FILTER : parts.join('|');
    });
    return merged;
}

export function compileBlacklistFilter(input: BlacklistFilter): Record<BlacklistFilterKey, RegExp> {
    const compiled = {} as Record<BlacklistFilterKey, RegExp>;
    BLACKLIST_KEYS.forEach((key) => {
        compiled[key] = new RegExp(input[key], 'g');
    });
    return compiled;
}

// 현재 갤러리(gallId)에 적용할 전역+갤러리별 병합 필터를 컴파일한다.
export function compileBlacklistForGallery(config: AppConfig, gallId: string | undefined): Record<BlacklistFilterKey, RegExp> {
    // 구버전 배경 스크립트가 blacklist_filter_by_gallery 없는 config를 넘겨도 안전하게 처리한다.
    const galleryMap = config.blacklist_filter_by_gallery ?? {};
    const gallery = gallId ? galleryMap[gallId] : undefined;
    return compileBlacklistFilter(mergeBlacklistFilter(config.blacklist_filter, gallery));
}

export function parseUserMemoFilter(input: string): UserMemoInput {
    const parsed: UserMemoInput = {ip:[], tag:[]};
    input.split('\n').forEach(function (elem) {
        const [ip, tag] = elem.split('-');
        if(ip == null || tag == null) return;
        parsed.ip.push(ip);
        parsed.tag.push(tag);
    });
    return parsed;
}

function applyContentBlockToArticles(articles: Iterable<HTMLElement>, effect?: string): void {
    for (const article of articles) {
        const ubWriter = article.querySelector('.ub-writer');
        const ubWord = article.querySelector<HTMLElement>('.ub-word');
        if (!ubWriter || !ubWord) continue;
        const contentBlockReason = findBlockReason(extractWriterInfo(ubWriter, ubWord), filter.blacklist, getContentNoticeInfo(article, ubWord));
        if (contentBlockReason) {
            applyBlock(article, contentBlockReason, effect);
            // 제목 키워드로 차단된 경우, 어떤 키워드에 걸렸는지 제목에서 강조한다.
            if (contentBlockReason === 'keyword') highlightBlockedKeyword(ubWord, blacklistRegExp('keyword', filter.blacklist));
        }
    }
}

function applyContentBlockToComments(comments: Iterable<HTMLElement>, effect?: string): void {
    for (const comment of comments) {
        const ubWriter = comment.querySelector('.ub-writer');
        const ubWord = comment.querySelector<HTMLElement>('.ub-word');
        if (!ubWriter || !ubWord) continue;
        const contentBlockReason = findBlockReason(extractWriterInfo(ubWriter, ubWord), filter.blacklist);
        if (contentBlockReason) applyBlock(comment, contentBlockReason, effect);
    }
}

function applyMemoTags(elements: Iterable<Element>): void {
    for (const element of elements) {
        const writer = element.querySelector('.ub-writer');
        if (!writer) continue;
        const ip = writer.getAttribute('data-ip');
        const tag = findMemoTag(ip, filter.usermemo);
        if (ip && tag) applyMemoTag(writer, ip, tag);
    }
}

export const contentBlock = {
    toContent : function (effect?: string) {
        if(config.blacklist === false) return false;
        const tbody = document.querySelector('tbody');
        if (!tbody) return false;
        applyContentBlockToArticles(tbody.querySelectorAll<HTMLElement>('.ub-content'), effect);
    },
    toComment : function (effect?: string, _legacy?: unknown) {
        if(config.blacklist === false) return false;
        const reference = getCommentRoot();
        if (!reference) return false;
        applyContentBlockToComments(reference.querySelectorAll<HTMLElement>('.view_comment li[class^=ub-content]'), effect);
    },
    toggleContentDisplay : function (element: HTMLElement, effect?: string) {
        setElementVisibility(element, config.blacklist_view === true, effect);
        return true;
    }
} as const;

export const contentMemo = {
    convert : parseUserMemoFilter,
    toContent : function () {
        if(config.userMemo === false) return;
        applyMemoTags(qsa('tbody .ub-content'));
    },
    toComment : function () {
        if(config.userMemo === false) return;
        const root = getCommentMemoRoot();
        applyMemoTags(qsa('.view_comment li[class^=ub-content]', root));
    }
} as const;
