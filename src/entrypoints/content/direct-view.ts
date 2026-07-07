import { fetching } from './common';
import { parseHtml } from './dom';
import { insertCommentIframe } from './comment-iframe';
import { openDialog, closeDialog } from './dialog';
import { app } from './messaging';
import { manipulateDOM } from './page-ui';
import { postprocessing } from './postprocess';

interface ArticleFetchController {
    controller: AbortController | null;
    signal: AbortSignal | null;
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

export let loadArticleViaDialog = function (url: string) {
    if (!url) return false;
    let dialog = openDialog(document.querySelector('.dialog-fixer'), undefined, {
        onClose: abortArticleFetch,
    });
    if (!dialog) return false;
    else requestArticle(url, dialog);
};

var ac: ArticleFetchController = {
    controller: null,
    signal: null,
};

function abortArticleFetch(): void {
    if(ac.controller) ac.controller.abort();
}

const ERR_404 = '404';
const ERR_503 = '503';

let requestArticle = async function (url: string, dialogTemplate: HTMLElement | null = document.querySelector<HTMLElement>('#dcs_dialog_body')) {
    if (!dialogTemplate) return false;

    try {
        if(ac.controller) ac.controller.abort();
        ac.controller = new AbortController();
        ac.signal = ac.controller.signal;
        history.replaceState({ prev: location.href }, 'title', url);
        let res = await fetching(url + 'view_content_wrap', ac);

        if(!res.ok) {
            throw new Error(String(res.status));
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
        const message = getErrorMessage(error);
        if(message === ERR_404) {
            dialogTemplate.innerHTML = errorPage(message, '페이지를 불러오는데 실패하였습니다', '삭제된 글이거나 존재하지 않는 게시글 주소입니다');
        }
        else if (message === ERR_503) {
            dialogTemplate.innerHTML = errorPage(message, '페이지를 불러오는데 실패하였습니다', '서버가 응답하지 않았습니다');
        }
        else {
            dialogTemplate.innerHTML = errorPage(message, '페이지를 불러오는데 실패하였습니다', '서버가 응답하지 않았습니다');
        }
        document.querySelector('#errorImage')?.addEventListener('click', () => {
            requestArticle(url, dialogTemplate);
        });
    }

    function errorPage(errorMsg: string, header: string, context: string) {
        let errorTemplate = '<div id="errorPage">';
        errorTemplate += '<div id="errorImage"></div>';
        errorTemplate += '<br><br><br>';
        errorTemplate += '<h2>'+errorMsg+' : '+header+' </h2>';
        errorTemplate += '<span> '+context+' </span>';
        return errorTemplate;
    }
};

export { closeDialog };
