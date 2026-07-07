import type { AppConfig, BlacklistFilterKey } from '../../lib/default-config';
import { pageContext } from './context';
import { qsa, setElementVisibility } from './dom';
import { config, filter } from './state';

type UserMemoInput = {
    ip: string[];
    tag: string[];
};

function blacklistRegExp(key: BlacklistFilterKey): RegExp {
    return filter.blacklist[key] ?? /a^/;
}

export let contentBlock = {
    convert : function (input: AppConfig['blacklist_filter']): Record<BlacklistFilterKey, RegExp> {
        let o = {} as Record<BlacklistFilterKey, RegExp>;
        (Object.keys(input) as BlacklistFilterKey[]).forEach(elem => o[elem] = new RegExp(input[elem], 'g'));
        return o;
    },
    toContent : function (effect?: string) {
        let that = this;
        if(config.blacklist === false) return false;
        const tbody = document.querySelector('tbody');
        if (!tbody) return false;
        [ ...tbody.querySelectorAll<HTMLElement>('.ub-content') ].map(function (article) {
            let [ ubWriter, ubWord ]  = [ article.querySelector('.ub-writer'), article.querySelector<HTMLElement>('.ub-word') ];
            if (!ubWriter || !ubWord) return false;
            let contentBlockReason = undefined;
            let writerIP, writerID, writerNickName, contentText;
            let gallNum, gallSubject;

            writerID = ubWriter.getAttribute('data-uid');
            writerIP = ubWriter.getAttribute('data-ip');
            writerNickName = ubWriter.getAttribute('data-nick');
            contentText = ubWord !== null ? ubWord.innerText : undefined;
            gallNum = article.querySelector('.gall_num');
            gallSubject = article.querySelector('.gall_subject');

            let isCurrentArticle = !gallNum || gallNum.innerHTML.indexOf('class="sp_img crt_icon"') === -1;
            let noticeBlock = config.blacklist_notice === true;

            if (noticeBlock && ubWord.getAttribute('user_name') === '운영자') contentBlockReason = 'notice';
            else if (noticeBlock && gallNum && gallNum.innerHTML.match(/^[^0-9]{1,}$/) && isCurrentArticle) contentBlockReason = 'notice';
            else if (noticeBlock && gallSubject && gallSubject.textContent.match(/공지|뉴스|설문|AD/)) contentBlockReason = 'notice';
            else if (writerIP && writerIP.match(blacklistRegExp('ip'))) contentBlockReason = 'ip';
            else if (writerID && writerID.match(blacklistRegExp('id'))) contentBlockReason = 'id';
            else if (writerNickName && writerNickName.match(blacklistRegExp('nickname'))) contentBlockReason = 'nickname';
            else if (contentText !== undefined && contentText.match(blacklistRegExp('keyword'))) contentBlockReason ='keyword';

            if (contentBlockReason) {
                article.setAttribute('blackedUser', 'qvz');
                article.setAttribute('contentBlockReason', contentBlockReason);
                that.toggleContentDisplay(article, effect);
            }
        });
    },
    toComment : function (effect?: string, _legacy?: unknown) {
        let that = this;
        if (config.blacklist === false) return false;
        const iframe = document.querySelector<HTMLIFrameElement>('#dcs_iframe');
        if (pageContext.calltype === 'lists' && !iframe) return false;
        let reference = pageContext.calltype === 'lists' ? iframe?.contentWindow?.document.body : document.body;
        if (!reference) return false;
        [ ...reference.querySelectorAll<HTMLElement>('.view_comment li[class^=ub-content]') ].map(function (comment) {
            let [ ubWriter, ubWord ] = [ comment.querySelector('.ub-writer'), comment.querySelector<HTMLElement>('.ub-word') ];
            if (!ubWriter || !ubWord) return false;
            let contentBlockReason = undefined;
            let writerIP, writerID, writerNickName, commentText;

            writerIP = ubWriter.getAttribute('data-ip');
            writerID = ubWriter.getAttribute('data-uid');
            writerNickName = ubWriter.getAttribute('data-nick');
            commentText = ubWord !== null ? ubWord.innerText : undefined;

            if (writerIP && writerIP.match(blacklistRegExp('ip'))) contentBlockReason = 'ip';
            else if (writerID && writerID.match(blacklistRegExp('id'))) contentBlockReason = 'id';
            else if (writerNickName && writerNickName.match(blacklistRegExp('nickname'))) contentBlockReason = 'nickname';
            else if (commentText !== undefined && commentText.match(blacklistRegExp('keyword'))) contentBlockReason ='keyword';
            else if (writerNickName === '댓글돌이') contentBlockReason = 'notice';

            if (contentBlockReason) {
                comment.setAttribute('blackedUser', 'qvz');
                comment.setAttribute('contentBlockReason', contentBlockReason);
                that.toggleContentDisplay(comment, effect);
            }
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
            var writer = article.querySelector('.ub-writer');
            if (!writer) return;
            var ip = writer.getAttribute('data-ip');
            if (!ip) return;
            var match = filter.usermemo.ip.indexOf(ip);
            if(match === -1) return;
            writer.setAttribute('title', ip);
            const ipElement = writer.querySelector('.ip');
            if (ipElement) ipElement.innerHTML = '('+filter.usermemo.tag[match]+')';
        });
    },
    toComment : function () {
        if(config.userMemo === false) return;
        const iframe = document.querySelector<HTMLIFrameElement>('#dcs_iframe');
        var root = pageContext.calltype == 'lists' && iframe?.contentWindow ? iframe.contentWindow.document : document;
        qsa('.view_comment li[class^=ub-content]', root).forEach(function (comment) {
            var writer = comment.querySelector('.ub-writer');
            if (!writer) return;
            var ip = writer.getAttribute('data-ip');
            if (!ip) return;
            var match = filter.usermemo.ip.indexOf(ip);
            if (match !== -1){
                writer.setAttribute('title', ip);
                const ipElement = writer.querySelector('.ip');
                if (ipElement) ipElement.innerHTML = '('+filter.usermemo.tag[match]+')';
            }
        });
    }
};
