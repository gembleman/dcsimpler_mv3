import { exitMain } from './common';
import { createPageContext, setPageContext } from './context';
import { trigger } from './dom';
import { loadArticleViaDialog } from './direct-view';
import { compileBlacklistForGallery, contentMemo } from './filters';
import { loadList, setListLoaderDependencies } from './list-loader';
import { app } from './messaging';
import { manipulateDOM, setPageUiDependencies } from './page-ui';
import { postprocessing } from './postprocess';
import { config, filter, setConfig } from './state';
import { isCommandWriteMessage } from '../../lib/messages';

type UiCallType = 'lists' | 'view';
type PostprocessCallType = UiCallType | 'write';
type SupportedCallType = PostprocessCallType | 'modify';

setPageUiDependencies({ loadList });
setListLoaderDependencies({ loadArticleViaDialog });

function isSupportedCallType(calltype: string): calltype is SupportedCallType {
    return ['view', 'lists', 'write', 'modify'].includes(calltype);
}

function isUiCallType(calltype: SupportedCallType): calltype is UiCallType {
    return calltype === 'lists' || calltype === 'view';
}

function isPostprocessCallType(calltype: SupportedCallType): calltype is PostprocessCallType {
    return calltype !== 'modify';
}

function main() {
    const context = createPageContext();
    setPageContext(context);
    const calltype = context.calltype;

    if(!isSupportedCallType(calltype)) return exitMain();

    const configReady = app.requestConfig().then(function (data) {
        setConfig(data);
        filter.blacklist = compileBlacklistForGallery(data, context.query.id);
        filter.usermemo = contentMemo.convert(data.userMemo_filter);
    }).catch(function (error) {
        console.warn('Failed to load DCSimpler config.', error);
    });

    const onReady = async function() {
        if(!document.body) return exitMain();
        const bodyText = document.body.textContent?.trim() ?? '';
        if(bodyText.length === 0 || document.querySelector('.noaccess_wrap') !== null) return exitMain();
        if(bodyText === '정상적인 접근이 아닙니다') {
            window.location.reload();
            return exitMain();
        }
        await configReady;
        if(config === undefined) {
            alert('설정파일을 가져오는 데 실패하였거나, 로컬 스토리지를 사용할 수 없는 상태입니다.');
            return exitMain();
        }

        if (isUiCallType(calltype)) {
            manipulateDOM.run[calltype]?.();
        }
        if (isPostprocessCallType(calltype)) {
            postprocessing.run[calltype]?.();
        }

        if(calltype === 'lists' || calltype ==='view') loadList();
        return true;
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            onReady().catch(function (error) {
                console.error(error);
                exitMain();
            });
        });
    } else {
        onReady().catch(function (error) {
            console.error(error);
            exitMain();
        });
    }
}

function bindCommandListener() {
    chrome.runtime.onMessage.addListener(function (request: unknown) {
        if (!isCommandWriteMessage(request)) return;
        trigger(document.querySelector('#container'), 'mousedown');
        trigger(document.querySelector('#container'), 'click');
        trigger(document.querySelector('#subject'), 'mousedown');
        trigger(document.querySelector('form'), 'click');
        document.querySelector<HTMLElement>('.btn_blue.btn_svc.write, .btn_blue.write')?.click();
    });
}

export function startDcsimpler() {
    bindCommandListener();
    main();
}
