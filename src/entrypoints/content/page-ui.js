import { insertAfter, strToNode } from './common';
import { pageContext } from './context';
import { contentBlock, contentMemo } from './filters';
import { config } from './state';
import { bindHotkeys } from './hotkeys';

let pageUiDependencies = {
    loadList: null
};

export function setPageUiDependencies(dependencies) {
    pageUiDependencies = { ...pageUiDependencies, ...dependencies };
}

export let manipulateDOM = {
    wrapLists: () => {
        $(".gall_list").first().wrap('<div class="wrapGL"/>');
    },
    arrayTab: () => {
        $(".array_tab").children('button').remove().end().append(newBtnButton("")).prepend(`<div class="dialog-fixer"> fixer </div>`);
        $('.list_bottom_btnbox, .view_bottom_btnbox').children('.fl').children('button').remove().end().append(`<div class="array_tab left_box">${newBtnButton("goTop")}</div>`);

        $(document).on('click', '.btn_normal', arraytabListener);
        $(document).on('click', '.btn_recommend', arraytabListener);
        $(document).on('click', '.btn_notice', arraytabListener);
        $(document).on('click', '.btn_config', function () {
            chrome.runtime.sendMessage({flag: 'openConfig'});
        });

        function arraytabListener (event) {
            $( ".array_tab" ).children('button').removeClass('on').end().find("."+event.target.classList[0]).addClass('on');
            this.getAttribute("tag") === "goTop"? $('html, body').animate({scrollTop: $('.btn_normal').offset().top}, 400) : null;

            let classList = event.target.classList;

            if (classList.contains('btn_normal')) {
                pageUiDependencies.loadList(pageContext.url.goNormal);
            }
            else if (classList.contains('btn_recommend')) {
                pageUiDependencies.loadList(pageContext.url.goRecommend);
            }
            else if (classList.contains('btn_notice')) {
                pageUiDependencies.loadList(pageContext.url.goNotice);
            }
        }

        function newBtnButton (isMoveTop) {
            let p = "";
            let exceptionMode = pageContext.query["exception_mode"];
            let isE = !!exceptionMode;
            p += `<button type="button" name="button" class="btn_normal ${isE? "" : "on"}" tag="${isMoveTop}">전체글</button>`;
            p += `<button type="button" name="button" class="btn_recommend ${exceptionMode === "recommend"? "on" : "" }" tag="${isMoveTop}">개념글</button>`;
            p += `<button type="button" name="button" class="btn_notice ${exceptionMode === "notice"? "on" : "" }" tag="${isMoveTop}">공지</button>`;
            p += `<button type="button" name="button" class="btn_config">설정</button>`;
            return p;
        }
    },
    navigator: () => {
        let loginCheck = $('#login_box').children('.user_info').attr('data-alarmid');
        let loginString = loginCheck ? '로그아웃' : '로그인';
        let viewString = config.blacklist_view === true ? "on" : "off";
        let rightPanelVisibility = localStorage.io2 ? localStorage.io2 : localStorage.io2 = 'show';
        let reverseValue = rightPanelVisibility === "show"? "hide" : "show";

        let frag = `<div id="dcs_nav">
                        <div class="nav-node" id="io-progress" t="0">
                            <div class="icon"></div>
                            <div class="display"></div>
                            <span>로딩 현황</span>
                        </div>

                        <div class="nav-node" id="io-autoRefresh" t="0">
                            <div class="icon"></div>
                            <div class="display"></div>
                            <span>자동 새로고침</span>
                        </div>
                        <div class="nav-node ${viewString}" id="io-eye">
                            <div class="icon"></div>
                            <div class="display"></div>
                            <span>보기 모드</span>
                        </div>
                        <div class="nav-node" id="io-opt">
                            <div class="icon"></div>
                            <div id="opt-slideMenu">
                                <div class="icon"></div>
                                <div class="menu-block" id="login">${loginString}</div>
                                <div class="menu-block" id="config">설정</div>
                            </div>
                            <span>세부 설정</span>
                        </div>
                        <div class="nav-node" id="io-rptg" t="${reverseValue}">
                            <div class="icon"></div>
                            <span>우측 패널 최소/최대화</span>
                        </div>
                    </div>`;

        $(frag).prependTo('.right_box');

        rightPanelVisibility === 'show' ? $('.right_content').show() : $('.right_content').hide();

        // navigator >> slideMenu button
        $(document).on('click', '#io-opt', function (evt) {
            $('#opt-slideMenu').toggle();
            switch (evt.target.id) {
                case 'login' : {window.location.href = $('.btn_top_loginout').attr('href');break;}
                case 'config' : {chrome.runtime.sendMessage({flag: 'openConfig'});break;}
            }
        });
        // navigator >> rightPanelControl button
        $(document).on('click', '#io-rptg', function () {
            if( localStorage.io2 ) $('.right_content').toggle();
            if( localStorage.io2 === "show" ) {
                localStorage.io2 = "hide";
                $('#io-rptg').attr({t:"show"});
            }
            else if ( localStorage.io2 === "hide") {
                localStorage.io2 = "show";
                $('#io-rptg').attr({t:"hide"});
            }
        });
        // navigator >> autoRefresh button
        if(document.querySelector('#io-autoRefresh')) {
            document.querySelector('#io-autoRefresh').addEventListener('click', function () {
                let refreshRate = Number(window.prompt('자동 새로고침 주기를 설정해주세요 \n 초 단위, 0 이하의 숫자 입력 시 초기화됩니다', '0'));
                clearInterval(this.intervalID);
                if (!isNaN(refreshRate) && refreshRate > 0) {
                    this.classList.add('-running');
                    this.intervalID =  setInterval (function () {
                        document.querySelector('.btn_normal').click();
                    }, refreshRate*1000);
                } else {
                    this.classList.remove('-running');
                }
            });
        }
    },
    setProgress: (status) => {
        status = status === 0? "loading" : status === 1? "success" : status === -1? "fail" : status === -2? "error" : "fatalError";
        if(document.querySelector('#dcs_nav #io-progress')) {
            document.querySelector('#dcs_nav #io-progress').setAttribute("t", status);
        }
    },
    visitHistory : function () {
        let createGalleryElements = function (latelyGalleries) {
            if(!Array.isArray(latelyGalleries)) return "";
            return latelyGalleries.map( (elem, idx) => {
                let div = `<div index=${idx}>`;
                div += `<a href=${"//"+elem.link}> ${elem.name} </a>`;
                div += `<div id="dcs_closebox"></div>`;
                div += `</div>`;
                return div;
            }).join("");
        };
        let visitHistoryHTML = function (lately_gallery_array) {
            let outerHTML = `<div id="dcs_visit_history">`;
            outerHTML += createGalleryElements(lately_gallery_array);
            outerHTML += `</div>`;
            return outerHTML;
        };

        if(config.addRightSideVisitHistory === false) return false;
        let latelyGallery;
        try {
            latelyGallery = JSON.parse(localStorage.lately_gallery);
        } catch (e) {
            latelyGallery = [];
        }
        if (!Array.isArray(latelyGallery)) latelyGallery = [];
        insertAfter(strToNode(visitHistoryHTML(latelyGallery)), document.querySelector('#login_box'));

        document.querySelector('#dcs_visit_history').addEventListener('click', function (event) {
            if (event.target.id !== 'dcs_closebox') return false;
            let index = event.target.parentElement.attributes.index.value;
            latelyGallery.splice(index, 1);
            localStorage.lately_gallery = JSON.stringify(latelyGallery);
            document.querySelector('#dcs_visit_history').innerHTML = createGalleryElements(latelyGallery);
        });
    },
    outerButton: () => {
        $('.dcwrap')
            .append("<a id='backTop' class='external-button blue'>TOP</a>")
            .append(`<a id='viewToggle' class=external-button ${config.blacklist_view ? 'on' : ''}/>`);

        $(document).on('click', '.external-button#viewToggle', toggleContent);
        $(document).on('click', '.external-button#backTop', function () {
            let bodyOffset = $('html').offset();
            $('html, body').animate({scrollTop: bodyOffset.top}, "fast");
        });

        function toggleContent () {
            if(config.blacklist_view === true) config.blacklist_view = false;
            else if (config.blacklist_view === false) config.blacklist_view = true;
            contentBlock.toContent('fade'); // just toggle만
            contentBlock.toComment('fade');
            document.querySelector('#viewToggle').classList.toggle('on');
            document.querySelector('#io-eye').classList.toggle('on');
        }
    },
    imageRefreshBtn: () => {
        $('.title').first().append("<div class='refreshBtn' style='float : right; cursor: pointer; padding: 0 0 0 0;'>이미지 새로고침</div>");

        $(document).off('click', '.refreshBtn');
        $(document).on('click', '.refreshBtn', function () {
            var target = $('.writing_view_box').find('img[src^=https]');
            $.each(target, function (index, item) {
                var replace = $('.appending_file').children().eq(index).children().attr('href');
                $(item).attr('src', replace);
            })
        })
    },
    hotkeybinding: bindHotkeys,
    globalListener: () => {
        $(document).on('click', '.dcs_pagenationChild', function () {
            pageUiDependencies.loadList(this.attributes.href.value);
        });

        $(document).on('click', '.ui-widget-overlay', function (){
            $(".ui-dialog-titlebar-close").trigger('click');
        });
    },
    observeComment: () => {
        const commentRoot = document.querySelector('.view_comment');
        if (!commentRoot) return;
        observed(commentRoot);
        function observed(selector) {            //test-20191212
            let mo = new MutationObserver(process);
            mo.observe(selector, {subtree: true, childList:true, attributeOldValue: true, attributes: true});
            function process(mutations) {
                //listen page move
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
            manipulateDOM.set({
                wrapLists: true,
                arrayTab: true,
                navigator: true,
                outerButton: true,
                visitHistory: true,
                globalListener: true,
                hotkeybinding: true
            });
        },
        view: () => {
            manipulateDOM.set({
                wrapLists: true,
                arrayTab: true,
                navigator: true,
                outerButton: true,
                visitHistory: true,
                imageRefreshBtn: true,
                globalListener: true,
                hotkeybinding: true,
                observeComment: true
            });
        }
    }
};
