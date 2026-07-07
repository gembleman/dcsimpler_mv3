import { delegate } from './dom';
import { contentBlock, contentMemo } from './filters';
import { closeDialog } from './dialog';
import { app } from './messaging';
import { keyEnum, normalizeKey } from './state';
import { observeCommentMutations } from './comment-observer';

// Intentionally uses an iframe as a legacy adapter: the direct-view dialog fetches
// article content itself, but keeps DCInside's original comment runtime for
// posting, replies, dccon handling, refresh behavior, and site-side edge cases.
// Replacing this with fetch/API calls means owning those private request flows.
const COMMENT_IFRAME_ID = 'dcs_iframe';
const SMALL_LOADING_ID = 'small_loading';
const IFRAME_HEIGHT_PADDING = 20;
const INITIAL_IFRAME_STYLE = 'display:block; overflow: hidden; width :1px; height: 1px';
const FALLBACK_IFRAME_WIDTH = '555px';
const MAX_LOAD_ATTEMPTS = 10;
const RETRY_DELAY_MS = 1000;
const COMMENT_COUNT_ZERO = '0';
const TEXTAREA_FOCUS_DELAY_MS = 10;
const COMMENT_IFRAME_STYLE = '<style>html { overflow: hidden; } #container { margin-left : 1px !important; } .view_content_wrap { display : none !important; } .view_comment { width: 840px !important; } [id^=memo] { width : 630px !important; } .cmt_write_box.small [id^=memo] { width : 600px !important; } .view_bottom_btnbox { display : none !important; } .cmt_txtbox { width : 500px !important; } .usertxt.ub-word { width:inherit !important; } .ub-content[blackedUser~=qvz] { color:gray; background: #e4e4e4; } .ub-content[blackedUser~=qvz] td { color:gray; } .ub-content[blackedUser~=qvz] a { color:gray !important; } .pop_wrap.type3 { left : 19px !important; } div[id^=div-gpt] { display: none; } .wrap_inner { margin : 0 !important; } ::selection { background: #d7e8ff; color: #25282b; text-shadow: none; } red {color:#ff5442} blue {color:#4666ff} green {color:#00a500}</style>';

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function createCommentIframe(dialogTemplate: HTMLElement) {
    const smallLoading = document.createElement('div');
    smallLoading.id = SMALL_LOADING_ID;
    const iframe = document.createElement('iframe');
    iframe.id = COMMENT_IFRAME_ID;
    iframe.setAttribute('style', INITIAL_IFRAME_STYLE);
    dialogTemplate.append(smallLoading, iframe);
    return { smallLoading, iframe };
}

function hideSiblingsOfParents(element: Element) {
    let parent = element.parentElement;
    while (parent && parent.parentElement) {
        Array.from(parent.parentElement.children).forEach((sibling) => {
            if (sibling !== parent && sibling instanceof HTMLElement) sibling.style.display = 'none';
        });
        parent = parent.parentElement;
    }
}

function prepareIframeDocument(iframe: HTMLIFrameElement, dialogElement: HTMLDialogElement): Document {
    if (!iframe.contentWindow) throw new Error('iframe window is empty');
    const iframeDocument = iframe.contentWindow.document;
    iframeDocument.querySelectorAll('.write_div').forEach((element) => element.remove());
    const comments = iframeDocument.querySelectorAll('.view_comment');
    if(!comments.length) iframe.style.display = 'none';
    comments.forEach(hideSiblingsOfParents);
    const styleFragment = iframeDocument.createRange().createContextualFragment(COMMENT_IFRAME_STYLE);
    const lastStylesheet = Array.from(iframeDocument.querySelectorAll<HTMLLinkElement>("head link[rel='stylesheet']")).at(-1);
    if (lastStylesheet) lastStylesheet.after(styleFragment);
    else iframeDocument.head?.append(styleFragment);

    resizeIframeToContent(iframe, iframeDocument);
    iframe.style.width = iframeDocument.body.scrollWidth + 'px';
    dialogElement.focus();
    return iframeDocument;
}

function resizeIframeToContent(iframe: HTMLIFrameElement, iframeDocument: Document): number {
    const contentHeight = iframeDocument.body.scrollHeight;
    iframe.style.height = contentHeight + IFRAME_HEIGHT_PADDING + 'px';
    return contentHeight;
}

function bindIframeHotkeys(iframeDocument: Document): void {
    iframeDocument.addEventListener('keydown', function(event){
        const onTextarea = event.target instanceof Element && event.target.matches('input, textarea');
        const withoutCtrlKey = !event.ctrlKey;
        const key = normalizeKey(event);

        if(key === keyEnum.C && withoutCtrlKey && !onTextarea){
            document.querySelector<HTMLElement>('#avoiding_c')?.focus();
            setTimeout(function () {
                iframeDocument.querySelector<HTMLTextAreaElement>('textarea')?.focus();
            }, TEXTAREA_FOCUS_DELAY_MS);
        }
        else if(key === keyEnum.Q && withoutCtrlKey && !onTextarea) {
            document.querySelector<HTMLElement>('#viewToggle')?.click();
        }
        else if(key === keyEnum.ESC && withoutCtrlKey) {
            closeDialog();
        }
    });
}

function bindIframeReplyTracking(iframeDocument: Document, dialogElement: HTMLDialogElement): void {
    delegate(iframeDocument, 'click', '.repley_add, .repley_add_vote, .dccon_list_box .img_dccon', function (){
        app.sendToBackground('reply');
        dialogElement.focus();
    });
}

function maybeRefreshEmptyIframeComments(iframeDocument: Document): void {
    const dialogCommentBadge = document.querySelector('.gall_comment');
    const numberOfcommentsFromDialog = dialogCommentBadge ? (dialogCommentBadge.textContent ?? '').replace(/[^0-9]/g, '') : COMMENT_COUNT_ZERO;
    const commentCountElement = iframeDocument.querySelector<HTMLElement>('span[id^=comment]');
    const numberOfcommentsFromiFrame = commentCountElement ? commentCountElement.innerText.replace(/[^0-9]/g, '') : COMMENT_COUNT_ZERO;

    if(numberOfcommentsFromDialog !== COMMENT_COUNT_ZERO && numberOfcommentsFromiFrame === COMMENT_COUNT_ZERO) {
        iframeDocument.querySelector<HTMLElement>('.btn_cmt_refresh')?.click();
    }
}

function observeIframe(iframe: HTMLIFrameElement, selector: Document): MutationObserver {
    let originHeight = selector.body.scrollHeight;
    return observeCommentMutations(selector, function () {
        contentBlock.toComment();
        contentMemo.toComment();
    }, function () {
        try {
            if (document.getElementById(COMMENT_IFRAME_ID) === null) return false;
        }
        catch (e) {
            console.error(e);
            return 0;
        }
        const iframeDocument = iframe.contentWindow?.document;
        if(document.getElementById(COMMENT_IFRAME_ID) != null && iframeDocument && originHeight != iframeDocument.body.scrollHeight) {
            originHeight = resizeIframeToContent(iframe, iframeDocument);
        }
    });
}

export function insertCommentIframe(dialogTemplate: HTMLElement, url: string, retryDelay = RETRY_DELAY_MS) {
    const dialogElement = document.querySelector<HTMLDialogElement>('#dcs_dialog');
    if(!url || !dialogElement || !dialogTemplate) return false;
    const dialog = dialogElement;
    const { smallLoading, iframe } = createCommentIframe(dialogTemplate);
    let retryTimer: number | undefined;
    let commentObserver: MutationObserver | undefined;
    let loadAttempts = 0;
    let disposed = false;

    function cleanup() {
        disposed = true;
        iframe.removeEventListener('load', onLoad);
        commentObserver?.disconnect();
        if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    }

    function loadIframe() {
        if (disposed) return;
        iframe.addEventListener('load', onLoad);
        iframe.src = url;
    }

    function retryIframe() {
        iframe.removeEventListener('load', onLoad);
        if(loadAttempts >= MAX_LOAD_ATTEMPTS || disposed) return;
        iframe.src = '';
        retryTimer = window.setTimeout(loadIframe, retryDelay);
    }

    function onLoad() {
        if (disposed) return;
        let iframeDocument: Document;
        try{
            loadAttempts++;
            iframeDocument = prepareIframeDocument(iframe, dialog);
        } catch (e) {
            console.warn(new Date()+'IFRAME ERR : '+getErrorMessage(e));
            iframe.style.width = FALLBACK_IFRAME_WIDTH;
            retryIframe();
            return;
        }

        bindIframeHotkeys(iframeDocument);
        bindIframeReplyTracking(iframeDocument, dialog);
        commentObserver?.disconnect();
        commentObserver = observeIframe(iframe, iframeDocument);
        contentBlock.toComment(undefined, '');
        contentMemo.toComment();
        smallLoading.style.opacity = '0';
        maybeRefreshEmptyIframeComments(iframeDocument);
    }

    dialog.addEventListener('close', cleanup, { once: true });
    loadIframe();
    return dialogTemplate;
}
