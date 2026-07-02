/**common.js**/
function fetching (url, controller){
    const response = fetch(url, {
        signal: controller.signal,
        credentials: 'include'
    });
    return response.then(res => res);
}
function exitMain () {
    return alert('idk but occur error');
}
function insertAfter(newNode, existingNode) {
    existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
}
function strToNode(str) {
    return document.createRange().createContextualFragment(str);
}
function deleteElements(selector) {
    // in case the content script was injected after the page is partially loaded
    doDelete(document.querySelectorAll(selector));

    var mo = new MutationObserver(process);
    mo.observe(document, {subtree:true, childList:true});
    document.addEventListener('DOMContentLoaded', function() { mo.disconnect() });

    function process(mutations) {
        for (var i = 0, l = mutations.length; i < l; i++) {
            var nodes = mutations[i].addedNodes;
            for (var j = 0, k = nodes.length; j < k; j++) {
                var n = nodes[j];
                if (n.nodeType !== 1) // only process Node.ELEMENT_NODE
                    continue;
                doDelete(n.matches(selector) ? [n] : n.querySelectorAll(selector));
            }
        }
    }
    function doDelete(nodes) {
        [].forEach.call(nodes, function(node) { node.remove() });
    }
}
function observe(selector, process) {
    let mo = new MutationObserver(process);
    mo.observe(selector, {subtree: true, childList: true});
}
jQuery.fn.hasScrollBar = function () {
    if( this.height() < 800) {return this.get(0).scrollHeight > this.height();}
    else return this.get(0).scrollHeight-10 > 800;
};

// contentBlocking
let contentBlock = {
    convert : function (input) {
        let o = {};
        Object.keys(input).forEach(elem => o[elem] = new RegExp(input[elem], "g"));
        return o;
    },
    toContent : function (effect) {
        let that = this;
        if(config.blacklist === false) return false;
        [ ...document.querySelector('tbody').querySelectorAll('.ub-content') ].map(function (article) {
            let [ ubWriter, ubWord ]  = [ article.querySelector('.ub-writer'), article.querySelector('.ub-word') ];
            if (!ubWriter || !ubWriter) return false;
            let contentBlockReason = undefined;
            let writerIP, writerID, writerNickName, contentText;
            let gallNum, gallSubject;

            writerID = ubWriter.getAttribute('data-uid');
            writerIP = ubWriter.getAttribute('data-ip');
            writerNickName = ubWriter.getAttribute('data-nick');
            contentText = ubWord !== null ? ubWord.innerText : undefined;
            gallNum = article.querySelector('.gall_num');
            gallSubject = article.querySelector('.gall_subject');

            let isCurrentArticle = gallNum.innerHTML.indexOf("class=\"sp_img crt_icon\"") === -1;

            let noticeBlock = config.blacklist_notice === true;

            if (noticeBlock && ubWord.getAttribute('user_name') === '운영자') {
                contentBlockReason = 'notice';
            }
            else if (noticeBlock && gallNum && gallNum.innerHTML.match(/^[^0-9]{1,}$/) && isCurrentArticle) {
                contentBlockReason = 'notice';
            }
            else if (noticeBlock && gallSubject && gallSubject.textContent.match(/공지|뉴스|설문|AD/)) {
                contentBlockReason = 'notice';
            }
            else if (writerIP && writerIP.match(filter.blacklist['ip'])) {
                contentBlockReason = 'ip';
            }
            else if (writerID && writerID.match(filter.blacklist['id'])) {
                contentBlockReason = 'id';
            }
            else if (writerNickName && writerNickName.match(filter.blacklist['nickname'])) {
                contentBlockReason = 'nickname';
            }
            else if (contentText !== undefined && contentText.match(filter.blacklist['keyword'])) {
                contentBlockReason ='keyword';
            }

            if (contentBlockReason) {
                article.setAttribute('blackedUser', 'qvz');
                article.setAttribute('contentBlockReason', contentBlockReason);
                that.toggleContentDisplay(article, effect);
            }
        });
    },
    toComment : function (effect) {
        let that = this;
        if (config.blacklist === false) return false;
        if (location.calltype === "lists" && !document.querySelector('#dcs_iframe')) return false;
        let reference = location.calltype === "lists" ? document.querySelector('#dcs_iframe').contentWindow.document.body : document.body;
        [ ...reference.querySelectorAll('.view_comment li[class^=ub-content]') ].map(function (comment) {
            let [ ubWriter, ubWord ] = [ comment.querySelector('.ub-writer'), comment.querySelector('.ub-word') ];
            if (!ubWriter || !ubWriter) return false;
            let contentBlockReason = undefined;
            let writerIP, writerID, writerNickName, commentText;

            writerIP = ubWriter.getAttribute('data-ip');
            writerID = ubWriter.getAttribute('data-uid');
            writerNickName = ubWriter.getAttribute('data-nick');
            commentText = ubWord !== null ? ubWord.innerText : undefined;

            if (writerIP.match(filter.blacklist['ip'])) {
                contentBlockReason = 'ip';
            }
            else if (writerID.match(filter.blacklist['id'])) {
                contentBlockReason = 'id';
            }
            else if (writerNickName.match(filter.blacklist['nickname'])) {
                contentBlockReason = 'nickname';
            }
            else if (commentText !== undefined && commentText.match(filter.blacklist['keyword'])) {
                contentBlockReason ='keyword';
            }
            else if (writerNickName === '댓글돌이') {
                contentBlockReason = 'notice';
            }

            if (contentBlockReason) {
                comment.setAttribute('blackedUser', 'qvz');
                comment.setAttribute('contentBlockReason', contentBlockReason);
                that.toggleContentDisplay(comment, effect);
            }
        });
    },
    toggleContentDisplay : function (element, effect) {
        let $element = $(element);
        if (config.blacklist_view === true) {
            if (effect === 'fade') {
                $element.fadeIn();
            } else $element.show();
        } else {
            if (effect === 'fade') {
                $element.fadeOut();
            } else $element.hide();
        }
        return true;
    }
};

/** contentMemo  **/
let contentMemo = {
    convert : function (input) {
        let i = {ip:[], tag:[]};
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
        $('tbody').children('.ub-content').filter( function () {
            var writer = $(this).children('.ub-writer');
            var ip = writer.attr('data-ip');
            var match = filter.usermemo.ip.indexOf(ip);
            if(match === -1) return;
            $(writer).attr('title', filter.usermemo.ip[match]);
            $(writer).children('.ip').html('('+filter.usermemo.tag[match]+')');
        })
    },
    toComment : function () {
        if(config.userMemo === false) return;
        var root = location.calltype == "lists" ? $("#dcs_iframe").contents() : $('body');
        root.find('.view_comment li[class^=ub-content]').filter( function () {
            var writer = $(this).find('.ub-writer');
            var ip = writer.attr('data-ip');
            var match = filter.usermemo.ip.indexOf(ip);

            if( writer.length > 0 ){
                if (match !== -1){
                    $(writer).attr('title', filter.usermemo.ip[match]);
                    $(writer).find('.ip').html('('+filter.usermemo.tag[match]+')');
                }
            }
        })
    }
};

/**after.js**/

jQuery.fn.insertCommentIframe = function (url, timeout = 500) {
    var dialog = document.querySelector('#dcs_dialog');
    if(!url || !dialog) return false;

    console.log(`\t IFRAME URL : ${url}`);
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

    this.parent()
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
            }catch (e) {
                console.log(e);
                console.warn(new Date()+"IFRAME ERR : "+e.message);
                $('#dcs_iframe').width(555);
                $('#dcs_iframe').off('load');
                if( ctr < 10 ) {
                    $('#dcs_iframe').attr('src', '');
                    setTimeout(f(), 1000);
                    return 0;
                } else {
                    console.warn('---------------');
                    return 0;
                }
            }

            // keybinding in iframe
            $(document.getElementById('dcs_iframe').contentWindow.document).keydown(function(){
                var divLoc = iframeRoot.find('.cmt_write').offset();
                var onTextarea = $(event.target).is("input, textarea");
                var withoutCtrlKey = !event.ctrlKey;

                //c : go reply panel
                if(event.keyCode === keyEnum.C && withoutCtrlKey && !onTextarea){
                    $('#avoiding_c').focus();                   // avoding keyInput when hotkey 'C'
                    setTimeout(function () {
                        $(document.getElementById('dcs_iframe').contentWindow.document).find("textarea").focus();
                    },10);
                }
                // Q : toggle
                else if(event.keyCode === keyEnum.Q && withoutCtrlKey && !onTextarea) {
                    $('#viewToggle').trigger("click");
                }
                // ESC : close dialog
                else if(event.keyCode === keyEnum.ESC && withoutCtrlKey) {
                    console.log(history);
                    history.replaceState({prev: 'replace'}, 'title', history.state.prev);
                    $(".ui-dialog-titlebar-close").trigger('click');
                }
            });
            // click event from reply
            $(document.getElementById('dcs_iframe').contentWindow.document).on('click', '.repley_add, repley_add_vote, .dccon_list_box .img_dccon', function (){
                app.sendToBackground('reply');
                $('#dcs_dialog').parent().focus();
            });

            observeIframe(document.getElementById('dcs_iframe').contentWindow.document);
            contentBlock.toComment(null, "");
            contentMemo.toComment();
            $("#small_loading").css("opacity", "0");

            // when load to iframe without comment contents, forcing refresh comments
            var numberOfcommentsFromDialog = document.querySelector('.gall_comment').innerHTML.replace(/[^0-9]/g,"");
            var numberOfcommentsFromiFrame = document.getElementById('dcs_iframe').contentWindow.document.querySelector('span[id^=comment]');

            if(numberOfcommentsFromDialog !== '0' && numberOfcommentsFromiFrame === '0') {
                document.getElementById('dcs_iframe').contentWindow.document.querySelector('.btn_cmt_refresh').click();
                console.log('############ CMP FUNCTION ###########');
                console.log(numberOfcommentsFromDialog, numberOfcommentsFromiFrame);
            }
        });
    }

    // TODO : refactor mutation
    // TODO : try ~ : is neccesary?
    function observeIframe(selector) {            //test-20191212
        let mo = new MutationObserver(process);
        mo.observe(selector, {subtree: true, childList:true, attributeOldValue: true, attributes: true});
        var originHeight = selector.body.scrollHeight;
        //var w = document.getElementById('dcs_iframe').contentWindow.document.body.scrollWidth;
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
                var mutatedHeight =  document.getElementById('dcs_iframe').contentWindow.document.body.scrollHeight;
                originHeight != mutatedHeight;
            }
            catch (e) {
                console.log(document.getElementById('dcs_iframe'));
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
    return this;
};

function keywordHighlighting() {
    let keyword = $('input:hidden[name=s_keyword]').val();
    if (keyword && keyword != "" && keyword != "null") {
        $('.gall_tit').each(function(){
            let tmp_subject = $('a:first-child', this).clone();
            $('.icon_img', tmp_subject).remove();
            tmp_subject = $(tmp_subject).html();
            if (tmp_subject.match(keyword)) {
                var subject = tmp_subject.replace(keyword, '<span class="mark">'+ keyword +'</span>');
                subject = $('a:first-child', this).html().replace(tmp_subject, subject);
                $('a:first-child', this).html(subject);
            }
        });
    }
}

/**request.js**/
let listController = function () {
    this.controller = null;
    this.signal = null;
};

var lc = new listController();

let loadList = async function (requestURL) {
    manipulateDOM.setProgress(0);
    if(lc.controller) lc.controller.abort();
    if(requestURL == null) requestURL = location.href;
    lc.controller = new AbortController();
    lc.signal = lc.controller.signal;
    try {
        let res = await fetching(requestURL, lc);
        if(!res.ok) {
            manipulateDOM.setProgress(-1);
            throw new Error(res.status);
        }

        manipulateDOM.setProgress(1);
        history.replaceState({data: 'getLists'}, 'title', requestURL);
        let listHTML = await res.text();

        var newList = $(listHTML).find('.gall_list').addClass('onload').clone();
        var newPagenation = $(listHTML).find('.bottom_paging_box').eq(1).html();

        $('.left_content')
            .find('head').remove().end()
            .find('.wrapGL').html(newList[0]).end()
            .find('.bottom_paging_box').eq(0).html(newPagenation)
            .children('a').attr('onclick', 'return false;').attr('class', 'dcs_pagenationChild');

        contentBlock.toContent();
        contentMemo.toContent();

        $(".left_content .ub-content .gall_tit a").attr('onclick', 'return false;').click(function (evt) {
            $(this).blur();
            if (evt.target.classList[0] === 'icon_img' || !location.dcs.lists) {
                window.location.href = $(this).attr('href');
            }
            else config.directView === true ? loadArticleViaDialog($(this).attr('href')) : window.location.href = $(this).attr('href');
        });
        if(location.dcs.query["s_keyword"]) keywordHighlighting();

        //return response;
    } catch (error) {
        console.warn(error);
        manipulateDOM.setProgress(-2);
    }
}

let loadArticleViaDialog = function (url) {
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

    console.log('\t %cOPEN DIALOG', "color: blue; font-weight: bold");
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
            $("html").css("overflow", "overlay");
        },
        beforeClose: function () {
            $("#dcs_dialog").remove();
            clearTimeout(window.timer);
            if(ac.controller) ac.controller.abort();
        },
        resizable: false,
        autoOpen: false
    });
    opendDialog.parent().css({position:"fixed", background : postprocessing.dialogBackgroundColor}).end().dialog('open');
    // opendDialog.css('height', '800px');
    opendDialog.css('height', '84vh');
    opendDialog.css('background', postprocessing.dialogBackgroundColor);
    opendDialog.append('<div class="spinner_wrap"></div>');
    opendDialog.on('click', '.gall_comment', function () {  // move to iframe comments section
        document.getElementById('dcs_iframe').contentWindow.document.querySelector("#focus_cmt").scrollIntoView();
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
const ERR_200 = '200';
const ERR_503 = '503';

let requestArticle = async function (url, dialogTemplate = $('#dcs_dialog')) {

    try {
        if(ac.controller) ac.controller.abort();
        ac.controller = new AbortController();
        ac.signal = ac.controller.signal;
        history.replaceState({ prev: location.href }, 'title', url);
        let res = await fetching(url + "view_content_wrap", ac);
        console.log(res);

        if(!res.ok) {
            throw new Error (res.status);
        }
        app.sendToBackground('view');
        let articleWrap = $(await res.text()).find(".view_content_wrap");
        //if (articleWrap.length === 0) throw new Error(ERR_200);
        let article = articleWrap[0].outerHTML;
        dialogTemplate.html("").append(article).insertCommentIframe(url);

        postprocessing.forceReloadImage();
        manipulateDOM.imageRefreshBtn();
        postprocessing.blurImage();

    } catch (error) {
        console.log(error.message);
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
            //fetching(url + "view_content_wrap", ac)
            
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

/**merged.js**/
let app, mpd, b;
app = {};
app.requestConfig = function () {
    return new Promise ( function (resolve, reject) {
        chrome.runtime.sendMessage({flag: "request"}, function(response) {
            if(response) resolve(response);
        });
    })
}
app.getScripts = function (filenames) {
    let filename = filenames.split(',');
    let head = document.getElementsByTagName('head')[0];
    for(let i=0, l=filename.length ; i<l ; i++) {
        let script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = '//gall.dcinside.com/_js/'+filename[i].replace(" ", "");
        head.appendChild(script);
    }
}
app.sendToBackground = function (msg) {
    chrome.runtime.sendMessage({flag: msg, id: location.dcs.query.id, name: document.title}, function(response) {});
}

app.pruningUrl = () => {
    console.log(location);
    let o = {};
    // let pathname = location.pathname.replace(/\/+$/, '').split('/');
    // jQuery.each(pathname, function (key, value) {
    //     if(value.length === 0) return;
    //     o[value] = true;
    // });
    o = parsePathname2(location.pathname);
    o.pathname = parsePathname(location.pathname).reverse();
    o.query = parseQuery(location.search);
    o.url = {};
    o.url.regular = location.href.replace('&exception_mode=recommend', '').replace(/page=./, '').replace(/&$/, '');
    o.url.goNormal = o.url.regular + "&page=1";
    o.url.goRecommend = o.url.regular + "&page=1&exception_mode=recommend";
    o.url.goNotice = o.url.regular + "&page=1&exception_mode=notice";
    return o;

    function parseLocation(location, sperator) {
        return location.split(sperator);
    }

    function parsePathname2(str) {
        return str.replace(/^\/+|\/+$/g, "").split("/").reduce((acc, cuv) => (acc[cuv] = true, acc), {});
    }

    function parsePathname(str) {
        return str.replace(/^\/+|\/+$/g, "").split("/");
    }

    function parseQuery(str) {
        str = str.substr(str.indexOf("?")+1);
        str = str.split("&");
        let query = {};
        let split;
        for(let i=0,l=str.length ; i<l ; i+=1) {
            split = str[i].split("=");
            query[split[0]] = split[1];
        }
        return query;
    }
};

let manipulateDOM = {
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
            window.open('chrome-extension://'+chrome.runtime.id+'/html/config.html', '_blank');
        });

        function arraytabListener (event) {
            $( ".array_tab" ).children('button').removeClass('on').end().find("."+event.target.classList[0]).addClass('on');
            this.getAttribute("tag") === "goTop"? $('html, body').animate({scrollTop: $('.btn_normal').offset().top}, 400) : null;

            let classList = event.target.classList;

            if (classList.contains('btn_normal')) {
                loadList(location.dcs.url.goNormal);
            }
            else if (classList.contains('btn_recommend')) {
                loadList(location.dcs.url.goRecommend);
            }
            else if (classList.contains('btn_notice')) {
                loadList(location.dcs.url.goNotice);
            }
        }

        function newBtnButton (isMoveTop) {
            let p = "";
            let isE = !!location.dcs.query["exception_mode"];
            p += `<button type="button" name="button" class="btn_normal ${isE? "" : "on"}" tag="${isMoveTop}">전체글</button>`;
            p += `<button type="button" name="button" class="btn_recommend ${isE? "on" : "" }" tag="${isMoveTop}">개념글</button>`;
            p += `<button type="button" name="button" class="btn_notice ${!!location.dcs.query["exception_mode=notice"]? "on" : "" }" tag="${isMoveTop}">공지</button>`;
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
                case 'config' : {window.open('chrome-extension://'+chrome.runtime.id+'/html/config.html', '_blank');break;}
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
                console.log(this);
                if (isNaN(refreshRate) || refreshRate > 0) {
                    this.classList.add('-running');
                    this.intervalID =  setInterval (function () {
                        document.querySelector('.btn_normal').click();
                    }, refreshRate*1000);
                } else {
                    this.classList.remove('-running');
                    clearInterval(this.intervalID);
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
        let latelyGallery = JSON.parse(localStorage.lately_gallery);

        console.log(latelyGallery);
        insertAfter(strToNode(visitHistoryHTML(latelyGallery)), document.querySelector('#login_box'));

        document.querySelector('#dcs_visit_history').addEventListener('click', function (event) {
            if (event.target.id !== 'dcs_closebox') return false;
            let index = event.target.parentElement.attributes.index.value;
            latelyGallery.splice(index, 1);
            localStorage.lately_gallery = JSON.stringify(latelyGallery);
            document.querySelector('#dcs_visit_history').innerHTML = createGalleryElements(latelyGallery);
        });
    },
    searchbox: function () {
        let searchbox = '<div class="dcs_search_box">';
        searchbox += '<input class="dcs_search_box_inner">';
        $('#dcs_right_content').append(searchbox);
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
        $('.title:first').append("<div class='refreshBtn' style='float : right; cursor: pointer; padding: 0 0 0 0;'>이미지 새로고침</div>");

        $(document).off('click', '.refreshBtn');
        $(document).on('click', '.refreshBtn', function () {
            var target = $('.writing_view_box').find('img[src^=https]');
            $.each(target, function (index, item) {
                var replace = $('.appending_file').children().eq(index).children().attr('href');
                $(item).attr('src', replace);
            })
        })
    },
    hotkeybinding: () => {      // 핫키바인딩을 아이프레임과 통합할 것
        $("html").keydown(function(event) { //단축키 : c댓글이동, w글작성 q차단토글 r새로고침 t상단으로
            var divLoc = $('.cmt_write').offset();

            //c : go reply panel
            if(event.keyCode === 67 && !event.ctrlKey) {
                if($(event.target).is("input, textarea")) {
                }
                else if (location.dcs.lists && document.querySelector('#dcs_dialog')) {
                    $(document.getElementById('dcs_iframe').contentWindow.document).find("textarea").focus();
                }
                else if (location.dcs.view) {
                    $('#avoiding_c').focus(); // avoding keyInput when hotkey 'C'
                    setTimeout(function () {$('body').find("textarea").focus();},10);
                }
            }
            //w : go write page
            else if(event.keyCode === 87 && !event.ctrlKey) {
                if($(event.target).is("input, textarea, .ui-dialog")) {}
                else $('#btn_write').trigger("click");
            }
            //q : toggle blacklistView
            else if(event.keyCode === 81 && !event.ctrlKey) {
                if($(event.target).is("input, textarea")) {}
                else $('#viewToggle').trigger("click");
            }
            //r : refresh gallery
            else if(event.keyCode === 82 && !event.ctrlKey) {
                if($(event.target).is("input, textarea, .ui-dialog")) {}
                else $('.btn_normal:first').trigger("click");
            }
            //t : go page top
            else if(event.keyCode === 84 && !event.ctrlKey) {
                if($(event.target).is("input, textarea, .ui-dialog")) {}
                else $('html, body').animate({scrollTop : 0}, 400);
            }
            // a : back page list
            else if(event.keyCode === 65 && !event.ctrlKey) {
                if(!$(event.target).is("input, textarea, .ui-dialog")) {
                    var prev = $('body').find('.bottom_paging_box').children('em').prev();
                    if(prev.end().length === 0) prev = $('body').find('.bottom_paging_box').children('a').first();
                    prev.click();
                }
                else if($('#dcs_dialog').length) {

                }
            }
            // s: forward page list
            else if(event.keyCode === 83 && !event.ctrlKey) {
                if(!$(event.target).is("input, textarea, .ui-dialog")) {
                    var next = $('body').find('.bottom_paging_box').children('em').next();
                    if(next.end().length === 0) next = $('body').find('.bottom_paging_box').children('a').last();
                    next.click();
                }
                else if($('#dcs_dialog').length) {

                }
            }
        });
    },
    globalListener: () => {
        $(document).on('click', '.dcs_pagenationChild', function () {
            loadList(this.attributes.href.value);
        });

        $(document).on('click', '.ui-widget-overlay', function (){
            $(".ui-dialog-titlebar-close").trigger('click');
        });
    },
    observeComment: () => {
        observed(document.querySelector('.view_comment'));
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
                searchbox: true,
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
        },
        write: () => {

        },
        modify: () => {

        }
    }
};

let postprocessing = {};

postprocessing.blurImage = function () {
    if(config.blurImage === false) return;
    var target = $('.gallview_contents').children('.inner');
    var select = $(target).find('img, video');
    console.log(select);
    var element = '<div id="dcs_blurButton" style="display: none;" onclick="javascript:$(\'.gallview_contents\').children(\'.inner\').find(\'img\').removeAttr(\'onclick\')">bluring</div>';
    target.append(element);
    $('#dcs_blurButton').click();
    select.attr('blur', 'y');
    select.on('click', function (event) {
        $(this).attr('blur', 'n');
        event.preventDefault();
        event.stopPropagation();
    });

    document.body.addEventListener('click', function (event) {
        console.log(event.target.attributes);
    });
};
postprocessing.forceReloadImage = function () {
    if(config.autoRefreshImage === false) return;
    var target = $('.writing_view_box').find('img[src^=http][onclick^="javascript"]');
    $.each(target, function (index, item) {
        var replace = $('.appending_file').children().eq(index).children().attr('href');
        $(item).attr('src', replace);
    })
};
postprocessing.avoidServiceCode = function () {
    //for write page
    $('.write_infobox').focus().trigger('click');
    $('#subject').focus().trigger('click')
    $('.write_infobox').focus().trigger('click');
    $('#subject').focus().trigger('click').keydown(function (event) {
        if(event.keyCode === 9) {
            event.preventDefault();
            $('#tx_canvas_wysiwyg').focus();
        }
    });

    $('.write_infobox') // avoiding service_code:undefine
        .append('<a id="test" style="display: none;" href="javascript:console.log(_r); console.log(typeof _r);">TEST</a>')
        .append('<a id="mouseoverTrigger" style="display: none;" href="javascript:var e = $(\'div\');$.each(e, function(index, value){$(value).trigger(\'mouseover\'); console.log(_r)});">TEST</a>')
        .append('<a id="mousedownTrigger" style="display: none;" href="javascript:var e = $(\'div\');$.each(e, function(index, value){$(value).trigger(\'mousedown\'); console.log(_r)});">TEST</a>')
        .find('#mouseoverTrigger')[0].click();

    $(document).on('click', '.btn_blue.btn_svc.write', function (event) {
        app.sendToBackground('write');
    });
};

postprocessing.setBackgroundColorForDarkMode = function () {
    if($('#css-darkmode').index() < 0) {
        return 'white'
    }
    else return '#121212';
};
postprocessing.run = {};
postprocessing.run.lists = function () {
    postprocessing.dialogBackgroundColor = postprocessing.setBackgroundColorForDarkMode();
};
postprocessing.run.view = function () {
    postprocessing.blurImage();
    postprocessing.forceReloadImage();
    contentBlock.toComment();
    contentMemo.toComment();
};
postprocessing.run.write = function () {
    postprocessing.avoidServiceCode();
};
postprocessing.run.modify = function () {

};

/**main.js**/
let config, filter, devOption, selectors, progress, keyEnum, main;

filter = {
    blacklist: {},
    usermemo: { ip: [], tag: [] }
};
keyEnum = {
    C:67,
    Q:81,
    R:82,
    A:65,
    S:83,
    ESC:27
};
progress = {
    OK: 1,
    ERR_RED: -1,
    ERR_YEL: 2
};
selectors = {
    commentBox: "#dcs-comment-box",
    listWrapper: "#dcs-wrapper",
    iframe: "#dcs-iframe",
    navigator: "#dcs-navigator",
    viewToggler: '#dcs-view-toggle',
    backTop: '#dcs-backtop-button',
    rightContents: '#dcs-right-content',
    searchBox: '#dcs-right-search-box',
    pagenation: '#dcs-pagenation'
};
devOption = {
    nightly: chrome.runtime.id === 'kgpiejjjpjkcijopeabfleliifbhfnci'? 0 : 1,
    verbose: chrome.runtime.id === 'kgpiejjjpjkcijopeabfleliifbhfnci'? 0 : 2,
    showiFrame: chrome.runtime.id === 'kgpiejjjpjkcijopeabfleliifbhfnci'? 0 : 0
};


let calltype;
/** only run when has pathname **/
main = function () {
    let callTypeList = ['view', 'lists', 'write', 'modify'];
    let extensionType = chrome.runtime.id === 'kgpiejjjpjkcijopeabfleliifbhfnci'? 'pub' : 'dev';
    location.dcs = app.pruningUrl();
    location.calltype = calltype = location.dcs.pathname[0];
    console.log('DCSimpler ⚡ version '+chrome.runtime.getManifest().version+'/'+extensionType+'/'+calltype);

    if(!callTypeList.includes(calltype)) {
        return exitMain();
    }

    app.requestConfig().then(function (data) {
        config = data;
        filter.blacklist = contentBlock.convert(data.blacklist_filter);
        filter.usermemo = contentMemo.convert(data.userMemo_filter);
    });
    document.addEventListener("DOMContentLoaded", function() {
        window.dcs = 3;
        if(!document.body)
            return exitMain();  //avoiding redirect error
        if(document.body.innerHTML.length === 0 || document.querySelector('.noaccess_wrap') !== null)
            return exitMain();
        if(document.body.innerHTML === '정상적인 접근이 아닙니다') {
            window.location.reload();
            return exitMain();
        }
        if(config === undefined) {
            alert('설정파일을 가져오는 데 실패하였거나, 로컬 스토리지를 사용할 수 없는 상태입니다.');
            return exitMain();
        }

        manipulateDOM.run[calltype]();
        postprocessing.run[calltype]();

        if(calltype === 'lists' || calltype ==='view') {
            loadList();
        }

        return true;
    });
};

main();
