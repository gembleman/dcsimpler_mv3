import type { AppConfig, BlacklistFilterKey } from '../../lib/default-config';
import { pageContext } from './context';
import { qsa, setElementVisibility } from './dom';
import { config, filter, type CompiledBlacklistFilter, type UserMemoFilter } from './state';

type UserMemoInput = {
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

export let contentBlock = {
    convert : function (input: AppConfig['blacklist_filter']): Record<BlacklistFilterKey, RegExp> {
        let o = {} as Record<BlacklistFilterKey, RegExp>;
        (Object.keys(input) as BlacklistFilterKey[]).forEach(elem => o[elem] = new RegExp(input[elem], 'g'));
        return o;
    },
    toContent : function (effect?: string) {
        if(config.blacklist === false) return false;
        const tbody = document.querySelector('tbody');
        if (!tbody) return false;
        tbody.querySelectorAll<HTMLElement>('.ub-content').forEach(function (article) {
            const [ ubWriter, ubWord ]  = [ article.querySelector('.ub-writer'), article.querySelector<HTMLElement>('.ub-word') ];
            if (!ubWriter || !ubWord) return false;
            const contentBlockReason = findBlockReason(extractWriterInfo(ubWriter, ubWord), filter.blacklist, getContentNoticeInfo(article, ubWord));
            if (contentBlockReason) applyBlock(article, contentBlockReason, effect);
        });
    },
    toComment : function (effect?: string, _legacy?: unknown) {
        if (config.blacklist === false) return false;
        const reference = getCommentRoot();
        if (!reference) return false;
        reference.querySelectorAll<HTMLElement>('.view_comment li[class^=ub-content]').forEach(function (comment) {
            const [ ubWriter, ubWord ] = [ comment.querySelector('.ub-writer'), comment.querySelector<HTMLElement>('.ub-word') ];
            if (!ubWriter || !ubWord) return false;
            const contentBlockReason = findBlockReason(extractWriterInfo(ubWriter, ubWord), filter.blacklist);
            if (contentBlockReason) applyBlock(comment, contentBlockReason, effect);
        });
    },
    toggleContentDisplay : function (element: HTMLElement, effect?: string) {
        setElementVisibility(element, config.blacklist_view === true, effect);
        return true;
    }
};

export let contentMemo = {
    convert : function (input: string): UserMemoInput {
        let i: UserMemoInput = {ip:[], tag:[]};
        input.split('\n').forEach(function (elem) {
            let [ip, tag] = elem.split('-');
            if(ip == null || tag == null) return false;
            i.ip.push(ip);
            i.tag.push(tag);
        });
        return i;
    },
    toContent : function () {
        if(config.userMemo === false) return;
        qsa('tbody .ub-content').forEach(function (article) {
            const writer = article.querySelector('.ub-writer');
            if (!writer) return;
            const ip = writer.getAttribute('data-ip');
            const tag = findMemoTag(ip, filter.usermemo);
            if (ip && tag) applyMemoTag(writer, ip, tag);
        });
    },
    toComment : function () {
        if(config.userMemo === false) return;
        const root = getCommentMemoRoot();
        qsa('.view_comment li[class^=ub-content]', root).forEach(function (comment) {
            const writer = comment.querySelector('.ub-writer');
            if (!writer) return;
            const ip = writer.getAttribute('data-ip');
            const tag = findMemoTag(ip, filter.usermemo);
            if (ip && tag) applyMemoTag(writer, ip, tag);
        });
    }
};
