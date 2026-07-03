import { insertAfter, strToNode } from './common';
import { pageContext } from './context';
import { delegate, qsa } from './dom';
import { contentBlock, contentMemo } from './filters';
import { config } from './state';
import { bindHotkeys } from './hotkeys';

let pageUiDependencies = { loadList: null };

export function setPageUiDependencies(dependencies) {
    pageUiDependencies = { ...pageUiDependencies, ...dependencies };
}

export let manipulateDOM = {
    wrapLists: () => {
        const gallList = document.querySelector('.gall_list');
        if (!gallList || gallList.parentElement?.classList.contains('wrapGL')) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'wrapGL';
        gallList.parentNode.insertBefore(wrapper, gallList);
        wrapper.append(gallList);
    },
    arrayTab: () => {
        qsa('.array_tab').forEach((tab) => {
            Array.from(tab.children).filter((child) => child.tagName === 'BUTTON').forEach((button) => button.remove());
            tab.insertAdjacentHTML('beforeend', newBtnButton(''));
            tab.insertAdjacentHTML('afterbegin', '<div class="dialog-fixer"> fixer </div>');
        });
        qsa('.list_bottom_btnbox .fl, .view_bottom_btnbox .fl').forEach((box) => {
            Array.from(box.children).filter((child) => child.tagName === 'BUTTON').forEach((button) => button.remove());
            box.insertAdjacentHTML('beforeend', '<div class="array_tab left_box">'+newBtnButton('goTop')+'</div>');
        });

        delegate(document, 'click', '.btn_normal, .btn_recommend, .btn_notice', arraytabListener);
        delegate(document, 'click', '.btn_config', function () {
            chrome.runtime.sendMessage({flag: 'openConfig'});
        });

        function arraytabListener (event) {
            const className = this.classList[0];
            qsa('.array_tab > button').forEach((button) => button.classList.remove('on'));
            qsa('.array_tab .'+className).forEach((button) => button.classList.add('on'));
            if (this.getAttribute('tag') === 'goTop') document.querySelector('.btn_normal')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

            let classList = this.classList;
            if (classList.contains('btn_normal')) pageUiDependencies.loadList(pageContext.url.goNormal);
            else if (classList.contains('btn_recommend')) pageUiDependencies.loadList(pageContext.url.goRecommend);
            else if (classList.contains('btn_notice')) pageUiDependencies.loadList(pageContext.url.goNotice);
        }

        function newBtnButton (isMoveTop) {
            let p = '';
            let exceptionMode = pageContext.query['exception_mode'];
            let isE = !!exceptionMode;
            p += '<button type="button" name="button" class="btn_normal '+(isE? '' : 'on')+'" tag="'+isMoveTop+'">전체글</button>';
            p += '<button type="button" name="button" class="btn_recommend '+(exceptionMode === 'recommend'? 'on' : '' )+'" tag="'+isMoveTop+'">개념글</button>';
            p += '<button type="button" name="button" class="btn_notice '+(exceptionMode === 'notice'? 'on' : '' )+'" tag="'+isMoveTop+'">공지</button>';
            p += '<button type="button" name="button" class="btn_config">설정</button>';
            return p;
        }
    },
    navigator: () => {
        let loginCheck = document.querySelector('#login_box .user_info')?.getAttribute('data-alarmid');
        let loginString = loginCheck ? '로그아웃' : '로그인';
        let viewString = config.blacklist_view === true ? 'on' : 'off';
        let rightPanelVisibility = localStorage.io2 ? localStorage.io2 : localStorage.io2 = 'show';
        let reverseValue = rightPanelVisibility === 'show'? 'hide' : 'show';

        let frag = '<div id="dcs_nav">' +
            '<div class="nav-node" id="io-progress" t="0"><div class="icon"></div><div class="display"></div><span>로딩 현황</span></div>' +
            '<div class="nav-node" id="io-autoRefresh" t="0"><div class="icon"></div><div class="display"></div><span>자동 새로고침</span></div>' +
            '<div class="nav-node '+viewString+'" id="io-eye"><div class="icon"></div><div class="display"></div><span>보기 모드</span></div>' +
            '<div class="nav-node" id="io-opt"><div class="icon"></div><div id="opt-slideMenu"><div class="icon"></div><div class="menu-block" id="login">'+loginString+'</div><div class="menu-block" id="config">설정</div></div><span>세부 설정</span></div>' +
            '<div class="nav-node" id="io-rptg" t="'+reverseValue+'"><div class="icon"></div><span>우측 패널 최소/최대화</span></div>' +
            '</div>';

        document.querySelector('.right_box')?.insertAdjacentHTML('afterbegin', frag);
        qsa('.right_content').forEach((element) => element.style.display = rightPanelVisibility === 'show' ? '' : 'none');

        delegate(document, 'click', '#io-opt', function (evt) {
            const slideMenu = document.querySelector('#opt-slideMenu');
            if (slideMenu) slideMenu.style.display = slideMenu.style.display === 'block' ? 'none' : 'block';
            switch (evt.target.id) {
                case 'login' : { const href = document.querySelector('.btn_top_loginout')?.getAttribute('href'); if (href) window.location.href = href; break; }
                case 'config' : { chrome.runtime.sendMessage({flag: 'openConfig'}); break; }
            }
        });
        delegate(document, 'click', '#io-rptg', function () {
            if( localStorage.io2 ) qsa('.right_content').forEach((element) => element.style.display = element.style.display === 'none' ? '' : 'none');
            if( localStorage.io2 === 'show' ) {
                localStorage.io2 = 'hide';
                document.querySelector('#io-rptg')?.setAttribute('t', 'show');
            }
            else if ( localStorage.io2 === 'hide') {
                localStorage.io2 = 'show';
                document.querySelector('#io-rptg')?.setAttribute('t', 'hide');
            }
        });
        document.querySelector('#io-autoRefresh')?.addEventListener('click', function () {
            let refreshRate = Number(window.prompt('자동 새로고침 주기를 설정해주세요 \n 초 단위, 0 이하의 숫자 입력 시 초기화됩니다', '0'));
            clearInterval(this.intervalID);
            if (!isNaN(refreshRate) && refreshRate > 0) {
                this.classList.add('-running');
                this.intervalID =  setInterval (function () {
                    document.querySelector('.btn_normal')?.click();
                }, refreshRate*1000);
            } else {
                this.classList.remove('-running');
            }
        });
    },
    setProgress: (status) => {
        status = status === 0? 'loading' : status === 1? 'success' : status === -1? 'fail' : status === -2? 'error' : 'fatalError';
        document.querySelector('#dcs_nav #io-progress')?.setAttribute('t', status);
    },
    visitHistory : function () {
        let createGalleryElements = function (latelyGalleries) {
            if(!Array.isArray(latelyGalleries)) return '';
            return latelyGalleries.map( (elem, idx) => '<div index='+idx+'><a href="//'+elem.link+'"> '+elem.name+' </a><div id="dcs_closebox"></div></div>').join('');
        };
        let visitHistoryHTML = function (lately_gallery_array) {
            return '<div id="dcs_visit_history">'+createGalleryElements(lately_gallery_array)+'</div>';
        };

        if(config.addRightSideVisitHistory === false) return false;
        let latelyGallery;
        try {
            latelyGallery = JSON.parse(localStorage.lately_gallery);
        } catch (e) {
            latelyGallery = [];
        }
        if (!Array.isArray(latelyGallery)) latelyGallery = [];
        const loginBox = document.querySelector('#login_box');
        if (loginBox) insertAfter(strToNode(visitHistoryHTML(latelyGallery)), loginBox);

        document.querySelector('#dcs_visit_history')?.addEventListener('click', function (event) {
            if (event.target.id !== 'dcs_closebox') return false;
            let index = event.target.parentElement.attributes.index.value;
            latelyGallery.splice(index, 1);
            localStorage.lately_gallery = JSON.stringify(latelyGallery);
            document.querySelector('#dcs_visit_history').innerHTML = createGalleryElements(latelyGallery);
        });
    },
    outerButton: () => {
        document.querySelector('.dcwrap')?.insertAdjacentHTML('beforeend', '<a id="backTop" class="external-button blue">TOP</a><a id="viewToggle" class="external-button '+(config.blacklist_view ? 'on' : '')+'"></a>');
        delegate(document, 'click', '.external-button#viewToggle', toggleContent);
        delegate(document, 'click', '.external-button#backTop', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        function toggleContent () {
            if(config.blacklist_view === true) config.blacklist_view = false;
            else if (config.blacklist_view === false) config.blacklist_view = true;
            contentBlock.toContent('fade');
            contentBlock.toComment('fade');
            document.querySelector('#viewToggle')?.classList.toggle('on');
            document.querySelector('#io-eye')?.classList.toggle('on');
        }
    },
    imageRefreshBtn: () => {
        const title = document.querySelector('.title');
        if (!title) return;
        title.querySelector('.refreshBtn')?.remove();
        const button = document.createElement('div');
        button.className = 'refreshBtn';
        button.setAttribute('style', 'float : right; cursor: pointer; padding: 0 0 0 0;');
        button.textContent = '이미지 새로고침';
        title.append(button);

        button.addEventListener('click', function () {
            qsa('.writing_view_box img[src^=https]').forEach(function (item, index) {
                var replace = document.querySelectorAll('.appending_file > *')[index]?.querySelector('[href]')?.getAttribute('href');
                if (replace) item.setAttribute('src', replace);
            });
        });
    },
    hotkeybinding: bindHotkeys,
    globalListener: () => {
        delegate(document, 'click', '.dcs_pagenationChild', function () {
            pageUiDependencies.loadList(this.attributes.href.value);
        });
    },
    observeComment: () => {
        const commentRoot = document.querySelector('.view_comment');
        if (!commentRoot) return;
        observed(commentRoot);
        function observed(selector) {
            let mo = new MutationObserver(process);
            mo.observe(selector, {subtree: true, childList:true, attributeOldValue: true, attributes: true});
            function process(mutations) {
                for(let i=0, j=mutations.length ; i < j ; i++){
                    if(mutations[i].addedNodes.length > 0 && mutations[i].target.classList[0] === 'comment_wrap') {
                        contentBlock.toComment();
                        contentMemo.toComment();
                        break;
                    }
                }
            }
        }
    },
    set: (option) => {
        let tag = Object.keys(option);
        for(let i=0, j=tag.length ; i<j ; i++) {
            option[tag[i]] ? manipulateDOM[tag[i]]() : null;
        }
    },
    run: {
        lists: () => {
            manipulateDOM.set({ wrapLists: true, arrayTab: true, navigator: true, outerButton: true, visitHistory: true, globalListener: true, hotkeybinding: true });
        },
        view: () => {
            manipulateDOM.set({ wrapLists: true, arrayTab: true, navigator: true, outerButton: true, visitHistory: true, imageRefreshBtn: true, globalListener: true, hotkeybinding: true, observeComment: true });
        }
    }
};
