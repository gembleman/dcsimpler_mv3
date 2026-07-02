//require lsmm.js, egypt.js
var config;
var defaultConfig = {
    autoRefreshImage: false,    // option
    blacklist: true,
    blacklist_view: false,
    blacklist_notice: true,
    blurImage: false,
    directView: true,
    minimizeLayout: true,
    addRightSideVisitHistory: true,
    minimizeLayout_filter: '.gnb_bar, .concept_wrap, .issue_contentbox, .rightbanner, .content_box, .dcfoot, .gall_issuebox, .visit_history',
    upScale: false,
    userMemo: false,
    autoInsertImage: false,
    blacklist_filter : {id:'a^', ip:'a^', nickname:'a^', keyword:'a^'}, // filter
    userMemo_filter : '203.226-SK\n203.236-SK\n211.234-SK\n223.62-SK\n223.39-SK\n223.57-SK\n211.246-KT\n211.246-KT\n39.7-KT\n110.70-KT\n175.223-KT\n175.252-KT\n211.246-KT\n61.43-LG\n211.234-LG\n117.111-LG\n211.36-LG\n106.102-LG'
};
function sortObject(o) {
    var sorted = {},
        key, a = [];
    for (key in o) {
        if (o.hasOwnProperty(key)) a.push(key);
    }
    a.sort();
    for (key=0; key<a.length; key++) {
        sorted[a[key]] = o[a[key]];
    }
    return sorted;
}
// check dependancy and localstorage is empty
if(!lsmm) console.log('fail to load lsmm.js');
if(!egypt) console.log('fail to load egyptian.js');
config = lsmm.get("config", defaultConfig).value;
localStorage.updateChk ? null : localStorage.updateChk = false;

Object.keys(defaultConfig).forEach(function (key) {
    if(!config.hasOwnProperty(key)) {
        console.log(key);
        config[key] = defaultConfig[key];
    }
    localStorage.config = JSON.stringify(sortObject(config));
});

window._listener = {};

// oninstall listener
chrome.runtime.onInstalled.addListener(function(details){
    let previousVersion = details.previousVersion;
    let currentVersion = chrome.runtime.getManifest().version;
    if(previousVersion === currentVersion) details.reason = 'refresh';

    switch (details.reason) {
        case 'install': {
            console.log("🛠 INSTALL LISTEN : INSTALL");
            chrome.tabs.create({ url: "/html/config.html" });
            alert('처음 설치하신 경우 설정페이지의 도움말을 참조해주세요');
            break;
        }
        case 'update': {
            localStorage.updateChk = true;
            console.log("🛠 INSTALL LISTEN : UPDATE from " + previousVersion + " to " + currentVersion + "!");
            break;
        }
        case 'refresh': {
            console.log("🛠 INSTALL LISTEN : REFRESH");
            break;
        }
    }
});

// updatecheck
chrome.runtime.requestUpdateCheck(function (status) {
    console.log("🛠 UPDATE STATE   : "+status);
    if(status === 'update_available') {
    }
});
// extensionButtonClick listener ( on browser url bar )
chrome.browserAction.onClicked.addListener(function (){
    return chrome.tabs.create({ url: '../html/config.html' });
});
// storage change listener
window.addEventListener('storage', function (evt) {
    config = JSON.parse(localStorage.config);
}, false);
// messege listener
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log(request);       //request config
    let isConfigRequest = request.flag === 'request';
    if(isConfigRequest) return sendResponse(config);
    else return egypt.increase2(request), sendResponse({baz: "success"});
});
// command listener
chrome.commands.onCommand.addListener(function(command) {
    console.log('Command:', command);
    return chrome.tabs.query({"active": true, "lastFocusedWindow": true}, function (tabs) {
        console.log('tag');
        let cond = (tabs[0].url).match(/https:\/\/gall.dcinside.com(\/mgallery)?\/board\/(lists|view|write)/g);

        let code = `
        $('#container').trigger('mousedown');
        $('#container').trigger('click');
        $('#subject').trigger('mousedown');
        $('form:first').trigger('click');
        $('.btn_blue.btn_svc.write, .btn_blue.write').trigger('click'); `;

       // if (cond) chrome.tabs.executeScript(tabs[0].id, {code:'$(\'#subject\').trigger(\'mousedown\');$(\'form:first\').trigger(\'click\');$(\'.btn_blue.btn_svc.write, .btn_blue.write\').trigger(\'click\')'}, function (){});
        if (cond) chrome.tabs.executeScript(tabs[0].id, {code: code}, function (){});

    });
});

//committed
let preprocessing = {
    upScale : function (details) {
        if (config.upScale === false) return;
        chrome.tabs.insertCSS(details.tabId, {code: ".gall_tit {font-size: 14px !important;} .gall_list td {padding: 3.5px 4px 3.5px 4px !important;}", runAt: 'document_start'})
    },
    minimize : function (details) {
        if (config.minimizeLayout === false) return;
        chrome.tabs.insertCSS(details.tabId, {code: config.minimizeLayout_filter+"{display:none !important}", runAt: 'document_start'});
    },
    blur : function (details) {
        if(config.blurImage === false) return;
        let css = `.gallview_contents > .inner img, .gallview_contents > .inner video {
                            filter:blur(6px);
                            -webkt-filter:blur(6px);
                       }
                       .gallview_contents > .inner img[blur=n], .gallview_contents > .inner video[blur=n] {
                            filter:blur(6px);
                            -webkt-filter:blur(6px);
                       }
                       `;
        chrome.tabs.insertCSS(details.tabId, {code: ".gallview_contents > .inner img, .gallview_contents > .inner video{filter:blur(6px);-webkt-filter:blur(6px);}", runAt: "document_start"});
    },
    alignLeftContentWriter : function (details) {
        if(config["alignLeftContentWriter"] === false) return;
        console.log('ee');
        chrome.tabs.insertCSS(details.tabId, {code: ".wrapGL td.gall_writer.ub-writer {text-align: left;}", runAt: "document_start"});

    },
    testInjectCss: function () {
        let selectors = ".issue_contentbox, #gall_top_recom, .gnb_bar, .dcheader, .content_box";
        chrome.tabs.insertCSS(details.tabId, {code : hideElem(selectors), runAt: "document_start"});

        function hideElem (selectors) {
            return selectors.split(',').reduce(function (acc, cuv) {
                return acc+`${cuv.trim()}{display: none !important;}`;
            }, '');
        }
    }
};
chrome.webNavigation.onCommitted.addListener(function(details) {
    if(details.parentFrameId !== 0) {
        config.upScale ? preprocessing.upScale(details) : null;
        config.minimizeLayout ? preprocessing.minimize(details) : null;
        config.blurImage ? preprocessing.blur(details) : null;
        config.alignLeftContentWriter ? preprocessing.alignLeftContentWriter(details) : null;
    }
}, {url: [{urlMatches : 'https://gall.dcinside.com(/mgallery)?(/)?/board/(lists|view|write|modify)'}]});

// autoInsertImage
chrome.webNavigation.onDOMContentLoaded.addListener(function(details) {

    if(config.autoInsertImage !== false) {
        insertImageWritePage();
    }

    function insertImageWritePage() {
        let data = new LS().get('autoInsertImageData').value;
        if(Object.keys(data).length === 0) return false;
        let filename = data.filename;
        let filetype = data.filetype;
        let fileByte = data.filebyte;

        if(filename.length == 0 || filetype.length == 0 || fileByte.length==0) return false;

        chrome.tabs.executeScript(details.tabId,
            {code: 'var x = document.getElementById("tx_canvas_wysiwyg");\
        var y = (x.contentWindow || x.contentDocument);\
        if (y.document)y = y.document;\
        y.body.innerHTML =""'});

        chrome.tabs.executeScript(details.tabId, {code: 'document.getElementById("upload_status").value="Y";'}, function receiveText(resultsArray){
        });
        let r_key='';
        let gallID='';
        chrome.tabs.executeScript(details.tabId, {code: 'document.getElementById("r_key").value;'}, function receiveText(resultsArray){
            r_key = resultsArray[0];
            chrome.tabs.executeScript(details.tabId, {code: 'document.getElementById("id").value;'}, function receiveText(resultsArray){
                gallID = resultsArray[0];
                var XHR = new XMLHttpRequest();
                XHR.addEventListener('load',UploadComplete);
                XHR.addEventListener('error',UploadError);
                var FD  = new FormData();
                FD.append("r_key",r_key);
                FD.append("upload_ing","N");
                var imagefile = dataURLtoFile(fileByte,filename,filetype);
                FD.append("files[]",imagefile);
                let postUrl = 'https://upimg.dcinside.com/upimg_file.php'+"?id="+gallID+"&r_key="+r_key
                XHR.open('POST',postUrl);
                XHR.send(FD);
            });
        });

        function dataURLtoFile(dataurl, filename) {
            var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
                bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
            while(n--){
                u8arr[n] = bstr.charCodeAt(n);
            }
            return new File([u8arr], filename, {type:mime});
        }

        function UploadComplete(event)
        {
            let jObj = JSON.parse(event.target.responseText);
            let jMain = jObj.files[0];
            let imageUrl;
            console.log(Object.keys(jMain));
            for(let keys in jMain)
            {
                if(keys.includes("web")&&keys.includes("url"))
                {
                    imageUrl=jMain[keys];
                }
            }
            if(imageUrl==null)
            {
                imageUrl = jMain["url"];
            }
            //chrome.tabs.executeScript({code: 'var some = new Data('+jMain.file_temp_no+'); var some2 = new Attach(false,some); Editor.getAttachBox().datalist[0] = some2;'});
            // let imageTag = "<p style='text-align:left;'><img src='" + imageUrl + "' class='txc-image' style='clear:none;float:none;'/></p><br><br>";
            // chrome.tabs.executeScript(
            //     {code: 'var x = document.getElementById("tx_canvas_wysiwyg");\
            //     var y = (x.contentWindow || x.contentDocument);\
            //     if (y.document)y = y.document;\
            //     y.body.innerHTML ='+"\""+imageTag+"\""});
            let injectString ='var execAttach = Editor.getSidebar().getAttacher(\'image\',this).attachHandler; var _mockdata  = { \'imageurl\': \''+imageUrl+'\', \'filename\': \''+jMain.name+'\', \'filesize\': '+jMain.size+', \'imagealign\': \'L\', \'originalurl\': \''+jMain.url+'\', \'thumburl\': \''+jMain._s_url+'\', \'file_temp_no\': '+jMain.file_temp_no+' }; execAttach(_mockdata);';
            chrome.tabs.executeScript(details.tabId,
                {code: 'var injectedCode = \"'+injectString+'\";\
            var script = document.createElement("script");\
            script.appendChild(document.createTextNode(injectedCode));\
            (document.body || document.head || document.documentElement).appendChild(script);'});
            chrome.tabs.executeScript(details.tabId,
                {code: 'document.getElementById("subject").focus();'});
        }

        function UploadError(event)
        {
            console.log('Image transfer failed.');
        }
    }

}, {url: [{urlMatches : 'gall.dcinside.com(/mgallery)?/board/write/'}]});

chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
        return {cancel: details.url.indexOf("https://ir.joins.com") != -1};
    },
    {urls: ["<all_urls>"]},
    ["blocking"]
);

