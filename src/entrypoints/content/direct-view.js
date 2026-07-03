import { fetching } from './common';
import { contentBlock, contentMemo } from './filters';
import { app } from './messaging';
import { manipulateDOM } from './page-ui';
import { postprocessing } from './postprocess';
import { keyEnum, normalizeKey } from './state';

export function insertCommentIframe(dialogTemplate, url, timeout = 500) {
    var dialog = document.querySelector('#dcs_dialog');
    if(!url || !dialog) return false;
    var innerStyle = `<style>
                                html {
                                    overflow: hidden;
                                }
                                #container {
                                    margin-left : 1px !important;
                                }
                                .view_content_wrap {
                                    display : none !important;
                                }
                                .view_comment {
                                    width: 840px !important;
                                }
                                [id^=memo] {
                                    width : 630px !important;
                                }
                                .cmt_write_box.small [id^=memo] {
                                    width : 600px !important;
                                }
                                .view_bottom_btnbox {
                                    display : none !important;
                                }
                                .cmt_txtbox {
                                    width : 500px !important;
                                }
                                .usertxt.ub-word {
                                    width:inherit !important;
                                }
                                .ub-content[blackedUser~='qvz'] {
                                    color:gray;
                                    background: #e4e4e4;
                                }
                                .ub-content[blackedUser~='qvz'] td {
                                    color:gray;
                                }
                                .ub-content[blackedUser~='qvz'] a {
                                    color:gray !important;
                                }
                                .pop_wrap.type3 {
                                    left : 19px !Important;
                                }
                                div[id^=div-gpt] {
                                    display: none;
                                }
                                .wrap_inner {
                                    margin : 0 !important;
                                }
                                ::selection {
                                    background: #d7e8ff;
                                    color: #25282b;
                                    text-shadow: none;
                                }
                                red {color:#ff5442}
                                blue {color:#4666ff}
                                green {color:#00a500}
                     </style>`;

    dialogTemplate.parent()
        .append(`<div id="small_loading"></div>`).end()
        .append(`<iframe id="dcs_iframe" style="display:block; overflow: hidden; width :1px; height: 1px"></iframe>`);

    if (url === null) alert('iframe has no url!');

    var ctr = 0;
    var iframe = document.querySelector('#dcs_iframe');
    var $iframe = $(iframe);
    f();
    function f() {
        $iframe.attr('src', url).on('load', function () {
            var iframeRoot;
            try{
                ctr++;
                iframeRoot = $(document.getElementById('dcs_iframe').contentWindow.document);
                iframeRoot.find('.write_div').remove();
                if(!iframeRoot.find('.view_comment').length) $iframe.hide();
                iframeRoot.find('.view_comment').parents().each((i, parent) => {$(parent).siblings().css("display", "none")});
                iframeRoot.find("head link[rel='stylesheet']").last().after(innerStyle);

                $('#dcs_iframe').height(document.getElementById('dcs_iframe').contentWindow.document.body.scrollHeight+20);     // resize iframe
                $('#dcs_iframe').width(document.getElementById('dcs_iframe').contentWindow.document.body.scrollWidth);
                $('#dcs_dialog').parent().focus();
            } catch (e) {
                console.warn(new Date()+"IFRAME ERR : "+e.message);
                $('#dcs_iframe').width(555);
                $('#dcs_iframe').off('load');
                if( ctr < 10 ) {
                    $('#dcs_iframe').attr('src', '');
                    setTimeout(f, 1000);
                    return 0;
                }
                return 0;
            }

            // keybinding in iframe
            $(document.getElementById('dcs_iframe').contentWindow.document).keydown(function(event){
                var onTextarea = $(event.target).is("input, textarea");
                var withoutCtrlKey = !event.ctrlKey;
                var key = normalizeKey(event);

                //c : go reply panel
                if(key === keyEnum.C && withoutCtrlKey && !onTextarea){
                    $('#avoiding_c').focus();                   // avoding keyInput when hotkey 'C'
                    setTimeout(function () {
                        $(document.getElementById('dcs_iframe').contentWindow.document).find("textarea").focus();
                    },10);
                }
                // Q : toggle
                else if(key === keyEnum.Q && withoutCtrlKey && !onTextarea) {
                    $('#viewToggle').trigger("click");
                }
                // ESC : close dialog
                else if(key === keyEnum.ESC && withoutCtrlKey) {
                    history.replaceState({prev: 'replace'}, 'title', history.state.prev);
                    $(".ui-dialog-titlebar-close").trigger('click');
                }
            });
            // click event from reply
            $(document.getElementById('dcs_iframe').contentWindow.document).on('click', '.repley_add, .repley_add_vote, .dccon_list_box .img_dccon', function (){
                app.sendToBackground('reply');
                $('#dcs_dialog').parent().focus();
            });

            observeIframe(document.getElementById('dcs_iframe').contentWindow.document);
            contentBlock.toComment(null, "");
            contentMemo.toComment();
            $("#small_loading").css("opacity", "0");

            // when load to iframe without comment contents, forcing refresh comments
            var iframeDocument = document.getElementById('dcs_iframe').contentWindow.document;
            var dialogCommentBadge = document.querySelector('.gall_comment');
            var numberOfcommentsFromDialog = dialogCommentBadge ? dialogCommentBadge.innerHTML.replace(/[^0-9]/g, "") : "0";
            var commentCountElement = iframeDocument.querySelector('span[id^=comment]');
            var numberOfcommentsFromiFrame = commentCountElement ? commentCountElement.innerText.replace(/[^0-9]/g, "") : "0";

            if(numberOfcommentsFromDialog !== '0' && numberOfcommentsFromiFrame === '0') {
                var refreshButton = iframeDocument.querySelector('.btn_cmt_refresh');
                if (refreshButton) refreshButton.click();
            }
        });
    }

    function observeIframe(selector) {            //test-20191212
        let mo = new MutationObserver(process);
        mo.observe(selector, {subtree: true, childList:true, attributeOldValue: true, attributes: true});
        var originHeight = selector.body.scrollHeight;
        function process(mutations) {
            //listen page move
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
            //listen height change
            if(document.getElementById('dcs_iframe') != null && originHeight != document.getElementById('dcs_iframe').contentWindow.document.body.scrollHeight) {
                originHeight = (document.getElementById('dcs_iframe').contentWindow.document.body.scrollHeight+20);
                $('#dcs_iframe').height(document.getElementById('dcs_iframe').contentWindow.document.body.scrollHeight+20);
            }
        }
    }
    return dialogTemplate;
};

export let loadArticleViaDialog = function (url) {
    let dialog = openDialog($('.dialog-fixer'), undefined);
    if (!url) return false;
    else requestArticle(url, dialog);
};

let openDialog = function(position, callback) {
    let beforeUrl = location.href;
    let d = $('<div />', {id: 'dcs_dialog', click: function(e){e.preventDefault();}});
    let opendDialog;
    $('body > #dcs_dialog').remove();
    $('body').prepend(d.clone());
    opendDialog = $('#dcs_dialog').dialog({
        title: "",
        modal: true,
        width: '880px',
        position: {
            of: position,
            at: 'left bottom',
            my: 'left top'
        },
        open: function(){
            $("html").css("overflow", "hidden");
        },
        close: function(){
            history.replaceState({ prev: 'replace' }, 'title', beforeUrl);
            $("html").css("overflow", "auto");
        },
        beforeClose: function () {
            $("#dcs_dialog").remove();
            if(ac.controller) ac.controller.abort();
        },
        resizable: false,
        autoOpen: false
    });
    opendDialog.parent().css({position:"fixed", background : postprocessing.dialogBackgroundColor}).end().dialog('open');
    opendDialog.css('height', '84vh');
    opendDialog.css('background', postprocessing.dialogBackgroundColor);
    opendDialog.append('<div class="spinner_wrap"></div>');
    opendDialog.on('click', '.gall_comment', function () {  // move to iframe comments section
        var iframe = document.getElementById('dcs_iframe');
        var focusCmt = iframe && iframe.contentWindow.document.querySelector("#focus_cmt");
        if (focusCmt) focusCmt.scrollIntoView();
    });
    $(document).data('t_vch2','');

    typeof callback == 'function' ? callback(url, opendDialog) : null;
    return opendDialog;
};

var ArticleController = function () {
    this.controller = null;
    this.signal = null;
};

var ac = new ArticleController();

const ERR_404 = '404';
const ERR_503 = '503';

let requestArticle = async function (url, dialogTemplate = $('#dcs_dialog')) {

    try {
        if(ac.controller) ac.controller.abort();
        ac.controller = new AbortController();
        ac.signal = ac.controller.signal;
        history.replaceState({ prev: location.href }, 'title', url);
        let res = await fetching(url + "view_content_wrap", ac);

        if(!res.ok) {
            throw new Error (res.status);
        }
        app.sendToBackground('view');
        let articleWrap = $(await res.text()).find(".view_content_wrap");
        let article = articleWrap[0].outerHTML;
        insertCommentIframe(dialogTemplate.html("").append(article), url);

        postprocessing.forceReloadImage();
        manipulateDOM.imageRefreshBtn();
        postprocessing.blurImage();

    } catch (error) {
        if(error.message === ERR_404) {
            dialogTemplate.html(errorPage(error.message, '페이지를 불러오는데 실패하였습니다', '삭제된 글이거나 존재하지 않는 게시글 주소입니다'));
        }
        else if (error.message === ERR_503) {
            dialogTemplate.html(errorPage(error.message, '페이지를 불러오는데 실패하였습니다', '서버가 응답하지 않았습니다'))
        }
        else {
            dialogTemplate.html(errorPage(error.message, '페이지를 불러오는데 실패하였습니다', '서버가 응답하지 않았습니다'))
        }
        $('#errorImage').on('click', () => {
            requestArticle(url, dialogTemplate);
        });
    }

    function errorPage(errorMsg, header, context) {
        let errorTemplate = '<div id="errorPage">';
        errorTemplate += '<div id="errorImage"></div>';
        errorTemplate += '<br><br><br>';
        errorTemplate += `<h2>${errorMsg} : ${header} </h2>`;
        errorTemplate += `<span> ${context} </span>`;
        return errorTemplate;
    }
};
