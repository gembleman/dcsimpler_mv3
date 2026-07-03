import { fetching } from './common';
import { delegate, parseHtml } from './dom';
import { contentBlock, contentMemo } from './filters';
import { app } from './messaging';
import { manipulateDOM } from './page-ui';
import { postprocessing } from './postprocess';
import { keyEnum, normalizeKey } from './state';

let activeDialog = null;

export function closeDialog() {
    if (activeDialog?.open) activeDialog.close();
}

export function insertCommentIframe(dialogTemplate, url, timeout = 500) {
    var dialog = document.querySelector('#dcs_dialog');
    if(!url || !dialog || !dialogTemplate) return false;
    var innerStyle = '<style>html { overflow: hidden; } #container { margin-left : 1px !important; } .view_content_wrap { display : none !important; } .view_comment { width: 840px !important; } [id^=memo] { width : 630px !important; } .cmt_write_box.small [id^=memo] { width : 600px !important; } .view_bottom_btnbox { display : none !important; } .cmt_txtbox { width : 500px !important; } .usertxt.ub-word { width:inherit !important; } .ub-content[blackedUser~=qvz] { color:gray; background: #e4e4e4; } .ub-content[blackedUser~=qvz] td { color:gray; } .ub-content[blackedUser~=qvz] a { color:gray !important; } .pop_wrap.type3 { left : 19px !important; } div[id^=div-gpt] { display: none; } .wrap_inner { margin : 0 !important; } ::selection { background: #d7e8ff; color: #25282b; text-shadow: none; } red {color:#ff5442} blue {color:#4666ff} green {color:#00a500}</style>';

    const smallLoading = document.createElement('div');
    smallLoading.id = 'small_loading';
    const iframe = document.createElement('iframe');
    iframe.id = 'dcs_iframe';
    iframe.setAttribute('style', 'display:block; overflow: hidden; width :1px; height: 1px');
    dialogTemplate.append(smallLoading, iframe);

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
        var iframeDocument;
        try{
            ctr++;
            iframeDocument = iframe.contentWindow.document;
            iframeDocument.querySelectorAll('.write_div').forEach((element) => element.remove());
            const comments = iframeDocument.querySelectorAll('.view_comment');
            if(!comments.length) iframe.style.display = 'none';
            comments.forEach(hideSiblingsOfParents);
            const styleFragment = iframeDocument.createRange().createContextualFragment(innerStyle);
            const lastStylesheet = Array.from(iframeDocument.querySelectorAll("head link[rel='stylesheet']")).at(-1);
            if (lastStylesheet) lastStylesheet.after(styleFragment);
            else iframeDocument.head?.append(styleFragment);

            iframe.style.height = iframeDocument.body.scrollHeight + 20 + 'px';
            iframe.style.width = iframeDocument.body.scrollWidth + 'px';
            dialog.focus();
        } catch (e) {
            console.warn(new Date()+'IFRAME ERR : '+e.message);
            iframe.style.width = '555px';
            retryIframe();
            return;
        }

        iframeDocument.addEventListener('keydown', function(event){
            var onTextarea = event.target instanceof Element && event.target.matches('input, textarea');
            var withoutCtrlKey = !event.ctrlKey;
            var key = normalizeKey(event);

            if(key === keyEnum.C && withoutCtrlKey && !onTextarea){
                document.querySelector('#avoiding_c')?.focus();
                setTimeout(function () {
                    iframeDocument.querySelector('textarea')?.focus();
                },10);
            }
            else if(key === keyEnum.Q && withoutCtrlKey && !onTextarea) {
                document.querySelector('#viewToggle')?.click();
            }
            else if(key === keyEnum.ESC && withoutCtrlKey) {
                closeDialog();
            }
        });
        delegate(iframeDocument, 'click', '.repley_add, .repley_add_vote, .dccon_list_box .img_dccon', function (){
            app.sendToBackground('reply');
            dialog.focus();
        });

        observeIframe(iframeDocument);
        contentBlock.toComment(null, '');
        contentMemo.toComment();
        smallLoading.style.opacity = '0';

        var dialogCommentBadge = document.querySelector('.gall_comment');
        var numberOfcommentsFromDialog = dialogCommentBadge ? dialogCommentBadge.innerHTML.replace(/[^0-9]/g, '') : '0';
        var commentCountElement = iframeDocument.querySelector('span[id^=comment]');
        var numberOfcommentsFromiFrame = commentCountElement ? commentCountElement.innerText.replace(/[^0-9]/g, '') : '0';

        if(numberOfcommentsFromDialog !== '0' && numberOfcommentsFromiFrame === '0') {
            iframeDocument.querySelector('.btn_cmt_refresh')?.click();
        }
    }

    function hideSiblingsOfParents(element) {
        let parent = element.parentElement;
        while (parent && parent.parentElement) {
            Array.from(parent.parentElement.children).forEach((sibling) => {
                if (sibling !== parent) sibling.style.display = 'none';
            });
            parent = parent.parentElement;
        }
    }

    function observeIframe(selector) {
        let mo = new MutationObserver(process);
        mo.observe(selector, {subtree: true, childList:true, attributeOldValue: true, attributes: true});
        var originHeight = selector.body.scrollHeight;
        function process(mutations) {
            for(let i=0, j=mutations.length ; i < j ; i++){
                if(mutations[i].addedNodes.length > 0 && mutations[i].target.classList[0] === 'comment_wrap') {
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
            if(document.getElementById('dcs_iframe') != null && originHeight != iframe.contentWindow.document.body.scrollHeight) {
                originHeight = iframe.contentWindow.document.body.scrollHeight+20;
                iframe.style.height = iframe.contentWindow.document.body.scrollHeight+20 + 'px';
            }
        }
    }
    loadIframe();
    return dialogTemplate;
}

export let loadArticleViaDialog = function (url) {
    let dialog = openDialog(document.querySelector('.dialog-fixer'), undefined);
    if (!url) return false;
    else requestArticle(url, dialog);
};

let openDialog = function(position, callback) {
    let beforeUrl = location.href;
    document.querySelector('body > #dcs_dialog')?.remove();
    const dialog = document.createElement('dialog');
    dialog.id = 'dcs_dialog';
    dialog.innerHTML = '<button type="button" class="dcs-dialog-close" aria-label="close"></button><div id="dcs_dialog_body"></div>';
    document.body.prepend(dialog);
    const body = dialog.querySelector('#dcs_dialog_body');
    activeDialog = dialog;

    positionDialog(dialog, position);
    dialog.style.background = postprocessing.dialogBackgroundColor;
    body.style.background = postprocessing.dialogBackgroundColor;
    body.append(document.createElement('div'));
    body.firstElementChild.className = 'spinner_wrap';

    dialog.querySelector('.dcs-dialog-close')?.addEventListener('click', closeDialog);
    dialog.addEventListener('click', function (event) {
        if (clickedBackdrop(event, dialog)) closeDialog();
    });
    dialog.addEventListener('close', function () {
        history.replaceState({ prev: 'replace' }, 'title', beforeUrl);
        document.documentElement.style.overflow = 'auto';
        dialog.remove();
        if(ac.controller) ac.controller.abort();
        if (activeDialog === dialog) activeDialog = null;
    });
    document.documentElement.style.overflow = 'hidden';
    dialog.showModal();
    dialog.focus();

    delegate(body, 'click', '.gall_comment', function () {
        var iframe = document.getElementById('dcs_iframe');
        var focusCmt = iframe && iframe.contentWindow.document.querySelector('#focus_cmt');
        if (focusCmt) focusCmt.scrollIntoView();
    });

    typeof callback == 'function' ? callback(url, body) : null;
    return body;
};

function positionDialog(dialog, anchor) {
    const rect = anchor?.getBoundingClientRect();
    const width = Math.min(880, window.innerWidth - 24);
    const left = rect ? Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)) : Math.max(12, (window.innerWidth - width) / 2);
    const top = rect ? Math.max(12, Math.min(rect.bottom, window.innerHeight - 80)) : 48;
    dialog.style.width = width + 'px';
    dialog.style.left = left + 'px';
    dialog.style.top = top + 'px';
}

function clickedBackdrop(event, dialog) {
    if (event.target !== dialog) return false;
    const rect = dialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
}

var ArticleController = function () {
    this.controller = null;
    this.signal = null;
};

var ac = new ArticleController();

const ERR_404 = '404';
const ERR_503 = '503';

let requestArticle = async function (url, dialogTemplate = document.querySelector('#dcs_dialog_body')) {

    try {
        if(ac.controller) ac.controller.abort();
        ac.controller = new AbortController();
        ac.signal = ac.controller.signal;
        history.replaceState({ prev: location.href }, 'title', url);
        let res = await fetching(url + 'view_content_wrap', ac);

        if(!res.ok) {
            throw new Error (res.status);
        }
        app.sendToBackground('view');
        let articleWrap = parseHtml(await res.text()).querySelector('.view_content_wrap');
        if (!articleWrap) throw new Error('empty');
        dialogTemplate.replaceChildren(articleWrap.cloneNode(true));
        insertCommentIframe(dialogTemplate, url);

        postprocessing.forceReloadImage();
        manipulateDOM.imageRefreshBtn();
        postprocessing.blurImage();

    } catch (error) {
        if(error.message === ERR_404) {
            dialogTemplate.innerHTML = errorPage(error.message, '페이지를 불러오는데 실패하였습니다', '삭제된 글이거나 존재하지 않는 게시글 주소입니다');
        }
        else if (error.message === ERR_503) {
            dialogTemplate.innerHTML = errorPage(error.message, '페이지를 불러오는데 실패하였습니다', '서버가 응답하지 않았습니다');
        }
        else {
            dialogTemplate.innerHTML = errorPage(error.message, '페이지를 불러오는데 실패하였습니다', '서버가 응답하지 않았습니다');
        }
        document.querySelector('#errorImage')?.addEventListener('click', () => {
            requestArticle(url, dialogTemplate);
        });
    }

    function errorPage(errorMsg, header, context) {
        let errorTemplate = '<div id="errorPage">';
        errorTemplate += '<div id="errorImage"></div>';
        errorTemplate += '<br><br><br>';
        errorTemplate += '<h2>'+errorMsg+' : '+header+' </h2>';
        errorTemplate += '<span> '+context+' </span>';
        return errorTemplate;
    }
};
