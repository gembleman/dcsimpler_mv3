import { delegate } from './dom';
import { contentBlock, contentMemo } from './filters';
import { closeDialog } from './dialog';
import { app } from './messaging';
import { keyEnum, normalizeKey } from './state';

const COMMENT_IFRAME_STYLE = '<style>html { overflow: hidden; } #container { margin-left : 1px !important; } .view_content_wrap { display : none !important; } .view_comment { width: 840px !important; } [id^=memo] { width : 630px !important; } .cmt_write_box.small [id^=memo] { width : 600px !important; } .view_bottom_btnbox { display : none !important; } .cmt_txtbox { width : 500px !important; } .usertxt.ub-word { width:inherit !important; } .ub-content[blackedUser~=qvz] { color:gray; background: #e4e4e4; } .ub-content[blackedUser~=qvz] td { color:gray; } .ub-content[blackedUser~=qvz] a { color:gray !important; } .pop_wrap.type3 { left : 19px !important; } div[id^=div-gpt] { display: none; } .wrap_inner { margin : 0 !important; } ::selection { background: #d7e8ff; color: #25282b; text-shadow: none; } red {color:#ff5442} blue {color:#4666ff} green {color:#00a500}</style>';

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function createCommentIframe(dialogTemplate: HTMLElement) {
    const smallLoading = document.createElement('div');
    smallLoading.id = 'small_loading';
    const iframe = document.createElement('iframe');
    iframe.id = 'dcs_iframe';
    iframe.setAttribute('style', 'display:block; overflow: hidden; width :1px; height: 1px');
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

    iframe.style.height = iframeDocument.body.scrollHeight + 20 + 'px';
    iframe.style.width = iframeDocument.body.scrollWidth + 'px';
    dialogElement.focus();
    return iframeDocument;
}

function bindIframeHotkeys(iframeDocument: Document): void {
    iframeDocument.addEventListener('keydown', function(event){
        var onTextarea = event.target instanceof Element && event.target.matches('input, textarea');
        var withoutCtrlKey = !event.ctrlKey;
        var key = normalizeKey(event);

        if(key === keyEnum.C && withoutCtrlKey && !onTextarea){
            document.querySelector<HTMLElement>('#avoiding_c')?.focus();
            setTimeout(function () {
                iframeDocument.querySelector<HTMLTextAreaElement>('textarea')?.focus();
            },10);
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
    var dialogCommentBadge = document.querySelector('.gall_comment');
    var numberOfcommentsFromDialog = dialogCommentBadge ? dialogCommentBadge.innerHTML.replace(/[^0-9]/g, '') : '0';
    var commentCountElement = iframeDocument.querySelector<HTMLElement>('span[id^=comment]');
    var numberOfcommentsFromiFrame = commentCountElement ? commentCountElement.innerText.replace(/[^0-9]/g, '') : '0';

    if(numberOfcommentsFromDialog !== '0' && numberOfcommentsFromiFrame === '0') {
        iframeDocument.querySelector<HTMLElement>('.btn_cmt_refresh')?.click();
    }
}

function observeIframe(iframe: HTMLIFrameElement, selector: Document) {
    let mo = new MutationObserver(process);
    mo.observe(selector, {subtree: true, childList:true, attributeOldValue: true, attributes: true});
    var originHeight = selector.body.scrollHeight;
    function process(mutations: MutationRecord[]) {
        for(let i=0, j=mutations.length ; i < j ; i++){
            const target = mutations[i].target;
            if(mutations[i].addedNodes.length > 0 && target instanceof Element && target.classList[0] === 'comment_wrap') {
                contentBlock.toComment();
                contentMemo.toComment();
                break;
            }
        }
        try {
            if (document.getElementById('dcs_iframe') === null) return false;
        }
        catch (e) {
            console.error(e);
            return 0;
        }
        const iframeBody = iframe.contentWindow?.document.body;
        if(document.getElementById('dcs_iframe') != null && iframeBody && originHeight != iframeBody.scrollHeight) {
            originHeight = iframeBody.scrollHeight+20;
            iframe.style.height = iframeBody.scrollHeight+20 + 'px';
        }
    }
}

export function insertCommentIframe(dialogTemplate: HTMLElement, url: string, timeout = 500) {
    const dialog = document.querySelector<HTMLDialogElement>('#dcs_dialog');
    if(!url || !dialog || !dialogTemplate) return false;
    const dialogElement = dialog;
    const { smallLoading, iframe } = createCommentIframe(dialogTemplate);

    if (url === null) alert('iframe has no url!');

    var ctr = 0;
    function loadIframe() {
        iframe.addEventListener('load', onLoad);
        iframe.src = url;
    }
    function retryIframe() {
        iframe.removeEventListener('load', onLoad);
        if( ctr < 10 ) {
            iframe.src = '';
            setTimeout(loadIframe, 1000);
            return 0;
        }
        return 0;
    }
    function onLoad() {
        let iframeDocument: Document;
        try{
            ctr++;
            iframeDocument = prepareIframeDocument(iframe, dialogElement);
        } catch (e) {
            console.warn(new Date()+'IFRAME ERR : '+getErrorMessage(e));
            iframe.style.width = '555px';
            retryIframe();
            return;
        }

        bindIframeHotkeys(iframeDocument);
        bindIframeReplyTracking(iframeDocument, dialogElement);
        observeIframe(iframe, iframeDocument);
        contentBlock.toComment(undefined, '');
        contentMemo.toComment();
        smallLoading.style.opacity = '0';
        maybeRefreshEmptyIframeComments(iframeDocument);
    }
    loadIframe();
    return dialogTemplate;
}
