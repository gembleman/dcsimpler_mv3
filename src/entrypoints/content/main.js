import { exitMain } from './common';
import { createPageContext, setPageContext } from './context';
import { loadArticleViaDialog } from './direct-view';
import { contentBlock, contentMemo } from './filters';
import { loadList, setListLoaderDependencies } from './list-loader';
import { app } from './messaging';
import { manipulateDOM, setPageUiDependencies } from './page-ui';
import { postprocessing } from './postprocess';
import { config, filter, setConfig } from './state';

setPageUiDependencies({ loadList });
setListLoaderDependencies({ loadArticleViaDialog });

function main() {
    let callTypeList = ['view', 'lists', 'write', 'modify'];
    const context = createPageContext();
    setPageContext(context);
    const calltype = context.calltype;

    if(!callTypeList.includes(calltype)) {
        return exitMain();
    }

    const configReady = app.requestConfig().then(function (data) {
        setConfig(data);
        filter.blacklist = contentBlock.convert(data.blacklist_filter);
        filter.usermemo = contentMemo.convert(data.userMemo_filter);
    }).catch(function (error) {
        console.warn('Failed to load DCSimpler config.', error);
    });

    const onReady = async function() {
        if(!document.body)
            return exitMain();  //avoiding redirect error
        if(document.body.innerHTML.length === 0 || document.querySelector('.noaccess_wrap') !== null)
            return exitMain();
        if(document.body.innerHTML === '정상적인 접근이 아닙니다') {
            window.location.reload();
            return exitMain();
        }
        await configReady;
        if(config === undefined) {
            alert('설정파일을 가져오는 데 실패하였거나, 로컬 스토리지를 사용할 수 없는 상태입니다.');
            return exitMain();
        }

        if (typeof manipulateDOM.run[calltype] === 'function') manipulateDOM.run[calltype]();
        if (typeof postprocessing.run[calltype] === 'function') postprocessing.run[calltype]();

        if(calltype === 'lists' || calltype ==='view') {
            loadList();
        }

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

// Alt+S(글 등록) — MV3에서는 background가 코드 문자열을 주입할 수 없어
// 커맨드를 메시지로 받아 content script에서 처리한다
function bindCommandListener() {
    chrome.runtime.onMessage.addListener(function (request) {
        if (!request || request.flag !== 'command:write') return;
        $('#container').trigger('mousedown');
        $('#container').trigger('click');
        $('#subject').trigger('mousedown');
        $('form').first().trigger('click');
        $('.btn_blue.btn_svc.write, .btn_blue.write').trigger('click');
    });
}

export function startDcsimpler() {
    bindCommandListener();
    main();
}
