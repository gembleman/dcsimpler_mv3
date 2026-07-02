var config;
var version;
let ls = new LS();
var updateDescription = '업데이트되었습니다 변경사항을 확인해주세요';

var setupChart = function (ctx, range) {
    var data = getValues(range);


    Chart.defaults.global.defaultFontFamily = 'Noto Sans KR';
    Chart.defaults.global.defaultFontStyle = 'bold';
    var myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: getLabels(range),
            datasets: [
                {
                    label: '게시물 조회',
                    data: data.view,
                    yAxisID: 'y-a1',
                    //backgroundColor: '#337ab71f',
                    //backgroundColor: '#337ab742',
                    //backgroundColor: "red",
                    backgroundColor:'#ffffff00',
                    borderColor: '#337ab7',
                    lineTension: 0,
                    type:'line',
                    //fill:false,
                    //steppedLine: 'middle',
                    borderWidth: 3,
                    pointRadius: 3,
                    pointBorderWidth: 2,
                    //pointHoverRadius: 12,
                    pointBackgroundColor: 'white'
                },
                {
                    label: '글 작성',
                    data: data.write,
                    yAxisID: 'y-a2',
                    //backgroundColor: '#f3bc1442',
                    backgroundColor:'#ffffff00',
                    borderColor: '#f3bc206b',
                    //steppedLine: 'middle',
                    lineTension: 0,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointBorderWidth: 2,
                    pointBackgroundColor: 'white'
                },
                {
                    label: '댓글 작성',
                    data: data.reply,
                    yAxisID: 'y-a2',
                    //backgroundColor: '#31b71a42',
                    backgroundColor:'#ffffff00',
                    borderColor: '#2eb6238c',
                    lineTension: 0,
                    //steppedLine: 'middle',
                    borderWidth: 3,
                    pointRadius: 0,
                    pointBorderWidth: 2,
                    pointBackgroundColor: 'white'


                }]
        },
        options: {
            legend: {
                display: false,
                labels: {
                    fontColor: 'rgb(255, 99, 132)'
                }
            },
            tooltips: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                xAxes: [
                    {
                        gridLines : {
                            display: false,
                            drawBorder:true
                        }
                    }
                ],
                yAxes: [
                    {
                        id:'y-a1',
                        type:'linear',
                        position: 'left',
                        ticks: {
                            beginAtZero: true,
                            suggestedMax:getMax(data.view)+530,
                            //suggestedMin:getMin(viewData)-30
                        },
                        gridLines:{
                            drawBorder: false,
                        }
                    },
                    {
                        id:'y-a2',
                        type:'linear',
                        position:'right',
                        ticks: {
                            beginAtZero: true,
                            suggestedMax:getMax(data.write)+130,
                            //suggestedMin:getMin(writeData)-30
                        },
                        gridLines: {
                            drawOnChartArea: false, // only want the grid lines for one axis to show up
                            drawBorder: false,
                        }
                    }]
            }
        }
    });

    function getLabels(range) {
        let i = Object.keys(JSON.parse(localStorage["history"]));
        let o = [];
        jQuery.each(i, function(key, value) {
            o.push(value.replace("d", "").replace("/", "-"));
            return key+1 !== range;
        });
        return o.reverse();
    }

    function getValues(range) {
        let i  = egypt.groupByDay();
        let o = {"view": [], "write": [], "reply": []};
        let count = 0;
        jQuery.each(i, function (key, value) {
            o.view.push(value.view);
            o.write.push(value.write);
            o.reply.push(value.reply);
            count++;
            if(range) if(count===range) return false;
        });
        o.view.reverse();
        o.write.reverse();
        o.reply.reverse();
        return o;
    }


    function getMax(numArray) {
        return Math.max.apply(null, numArray);
    }
    function getMin(numArray) {
        return Math.min.apply(null, numArray);
    }
    function getSum() {
        let i =  egypt.groupByDay();
        let o = [];
        let sum = {"view": 0, "write": 0, "reply": 0};
        $.each(i, function(key,value){
            sum.view += value.view;
            sum.write += value.write;
            sum.reply += value.reply;
        });
        return sum;
    }

    var total = getSum();
    $('.view-box-part-detail[class~=view]').html(total.view);
    $('.view-box-part-detail[class~=write]').html(total.write);
    $('.view-box-part-detail[class~=reply]').html(total.reply);

    return myChart;
};

var setupDoughnutChart = function (ctx) {

    let i  = egypt.groupByGall();
    //console.log(i);
    let label = [];
    let data =  {"view": [], "write": [], "reply": []};
    $.each(i, function (key, value) {
        label.push(value.name);
        data.view.push(value.view);
        data.write.push(value.write);
        data.reply.push(value.reply);
    });
    //data.view.sort(ascending);
    //data.write.sort(ascending);
    //data.reply.sort(ascending);
    //console.log(label);
    //console.log(data);

    function ascending (a, b) {
        return b - a;
    };
    function makeColor (main, other, size) {
        let o = [];
        o.push(main);
        for(let i=0 ; i < size ; i++) o.push(other);
        return o;
    }
    let z = ['#ff6384', '#ff9f43', '#ffcd59', '#4bc0c0', '#38a2ea', '#9a68fe', '#c9cbcf']


    let array = [];
    array = Object.keys(i).map(function (key, index) {
        //console.log(i);
        return [key, i[key].name, i[key].view, i[key].write, i[key].reply, z[index]];
    });

    array.sort(function (a, b) {
       return b[2] - a[2];
    });
    //console.log(array);


    //console.log(array.sort( (a, b) => b[2] - a[2]));


    let ranColor = [];
    let size = label.length;
    for(let i=0 ; i < size ; i++) {
        ranColor.push("#" + Math.round( Math.random() * 0xFFFFFF ).toString(16));
    }

    var doughnutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            "labels": label,
            "datasets": [
                {
                    "label": "My First Dataset",
                    "data": data.view,
                    "backgroundColor": ['#ff6384', '#ff9f43', '#ffcd59', '#4bc0c0', '#38a2ea', '#9a68fe', '#c9cbcf']
                    //makeColor('#337ab7', '#337ab79e', 10)
                },
                {
                    "label": "My First Dataset",
                    "data": data.write,
                    "backgroundColor": ['#ff6384', '#ff9f43', '#ffcd59', '#4bc0c0', '#38a2ea', '#9a68fe', '#c9cbcf']
                },
                {
                    "label": "My First Dataset",
                    "data": data.reply,
                    "backgroundColor": ['#ff6384', '#ff9f43', '#ffcd59', '#4bc0c0', '#38a2ea', '#9a68fe', '#c9cbcf']
                }]
        },
        options: {
            legend: {
                display: false,
                labels: {
                    fontColor: 'rgb(255, 99, 132)',
                }
            },
            tooltips: {
                bodyFontSize: "22",
                displayColors: false
            }
        }
    });
    return doughnutChart;
};

var initEditText = function () {

    $.each($('.editText[tag=blacklist]'), function () {
        var id = $(this).attr('id');
        var value = config.blacklist_filter[id];
        if (value === 'a^' || value.length === 0) $(this).val('');
        else $(this).val(value);
    });


};
var initBlacklist = function () {
    var id = config.blacklist_filter.id;
    var ip = config.blacklist_filter.ip;
    var nickname = config.blacklist_filter.nickname;
    var keyword = config.blacklist_filter.keyword;

    ip = ip == 'a^'? '' : ip.replace(/\|/g,'\r\n');
    id = id == 'a^'? '' : id.replace(/\|/g,'\r\n');
    nickname = nickname == 'a^'? '' : nickname.replace(/\|/g,'\r\n');
    keyword = keyword == 'a^'? '' : keyword.replace(/\|/g,'\r\n');

    $('.editText.blacklist.id').val(id);
    $('.editText.blacklist.ip').val(ip);
    $('.editText.blacklist.nickname').val(nickname);
    $('.editText.blacklist.keyword').val(keyword);

    TLN.append_line_numbers('tln-blacklist-id');
    TLN.append_line_numbers('tln-blacklist-ip');
    TLN.append_line_numbers('tln-blacklist-nickname');
    TLN.append_line_numbers('tln-blacklist-keyword');

    $('.editText.blacklist').each(growTextarea);
    $('.smallbox.blacklist').not('.nickname').hide();
};


var initUsermemo = function () {
    var value = config.userMemo_filter;
    $('textarea.userMemo').val(value);
    TLN.append_line_numbers('tln-userMemo');
    $('textarea.userMemo').each(growTextarea);
    if ($('textarea.userMemo').css('height') === '0px') $('textarea.userMemo').css('height', '72px');


    //--



};


var initBootStrapButton = function () {
    $('.toggler').not('.sub-option').each( function () {

        var key = $(this).attr('t');
        var value = config[key];
        $(this).bootstrapSwitch('state', value);

        if($(this).attr('haveChildren') != null) {
            if($(this).is(":checked") === false) $(this).parents('.box').next().css('display', 'none');
        }
    });

    $("div[class^=menu-container]").not("[index='0']").hide();
};

let add_update_notification = function (innerText) { if(localStorage.updateChk === "false") return;
    let update_noti;
    update_noti = '<div class="update-notification upn-container">';
    update_noti += '<div class="upn-title"><i class="fas fa-info-circle" style="margin-right: 10px"/>v.'+version+'_updatelog</div>';
    update_noti += '<div class="upn-close-button"><i class="fas fa-times" id="close"/></div>';
    update_noti += '<div class="upn-detail">'+innerText+'</div>';
    $('body').append(update_noti);

    $(document).on('click', '.update-notification', function (event) {
        $('.update-notification').remove();
        localStorage.updateChk = false;
        if( event.target.id !== 'close') $(".item[index='5']").trigger('click');
    })
};

var addFootprint = function () {
    var footPrint='';
    footPrint += '<div id="footPrint">';
    footPrint += 'dcsimpler | '+version;
    $('body').append(footPrint);
};

var loadUpdatelog = function () {
    let getData = $.ajax({url: 'https://sites.google.com/view/dcsimpler/'});
    getData.done(function (response, status, xhr) {
        $('#updatelog').append($(response).find('div[role=main]'));
    })
};

function growTextarea (i,elem) {
    var elem = $(elem);
    var offset = elem.prop('offsetHeight') - elem.prop('clientHeight');
    var resizeTextarea = function( elem ) {
        // two additional variables getting the top and left scoll positions.
        var scrollLeft = window.pageXOffset || (document.documentElement || document.body.parentNode || document.body).scrollLeft;
        var scrollTop  = window.pageYOffset || (document.documentElement || document.body.parentNode || document.body).scrollTop;
        elem.css('height', 'auto').css('height', elem.prop('scrollHeight') );
        // Applying previous top and left scroll position after textarea resize.
        window.scrollTo(scrollLeft, scrollTop);
    };
    elem.on('input', function() {
        resizeTextarea( $(this) );
    });
    resizeTextarea( $(elem) );
};

var testfield = function (obj) {
    let filter = lsmm.get('config').value.blacklist_filter;
    Object.keys(filter).forEach(function (elem) {

        let $frag = $(document.createDocumentFragment());
        let arr = filter[elem].split('|');
        $frag.append(`<div class="data-info">${filter[elem].length}</div>`);
        $frag.append(`<div class="data-info2">${arr.length}</div>`);
       let frag = arr.reduce( (acc, cuv) => (acc.append(`<div class="fragments">${cuv} </div>`), acc), $frag);
       $(obj[elem]).append(frag);
    });
};



var HEADERS_TO_STRIP_LOWERCASE = [ 'conte'+'nt-security-policy', 'x-fram'+'e-options', 'x-cont'+'ent-security-options','x-web'+'kit-csp' ];
chrome.webRequest.onHeadersReceived.addListener(function(details) {
    return { responseHeaders: details.responseHeaders.filter(function(header) { return HEADERS_TO_STRIP_LOWERCASE.indexOf(header.name.toLowerCase()) < 0; })};
}, {urls: ["<all_urls>"]}, ["blocking", "responseHeaders"]);

$(document).ready(function () {
    config = new LS().get("config").print().value;
    version = chrome.runtime.getManifest().version;
    $('#bg').css('opacity','0').css('z-index','-999');
    $('#footer').html('dcsimpler_v.'+version);
    $(".menu-container[index='5'] p:first").prepend('<p>ver.'+version+'</p>');
    add_update_notification(updateDescription);
    initEditText();
    initUsermemo();
    initBlacklist();
    initBootStrapButton();
    addFootprint();
    loadUpdatelog();


    //$('.testy').linedtextarea();
    let chart = new setupChart($('#weekly-chart'), 7);   //통계 그래픽 출력
    let monthChart = new setupChart($('#monthly-chart'), 30);
    let doughnutChart = new setupDoughnutChart($('#doughnut-chart'));
    testfield({
        nickname : document.querySelector('.test-field.nickname'),
        id : document.querySelector('.test-field.id'),
        ip : document.querySelector('.test-field.ip'),
        keyword : document.querySelector('.test-field.keyword')

    });

    document.getElementById('goShortCut').addEventListener('click', function() {
        chrome.tabs.create({url:'chrome://extensions/configureCommands'});
    });

    window._listener = {};

    // MENU INDEX
    window._listener.menu = $(document).on('click', '.item', function () {
        var index = $(this).attr('index');
        var menus = $('.item');
        var containers = $('.menu-container');
        if($(this).attr('pageMove') != null) {window.open("https://chrome.google.com/webstore/detail/dcsimpler/kgpiejjjpjkcijopeabfleliifbhfnci?hl=ko"); return;}

        menus
            .removeClass('clicked')
            .filter('[index~='+index+']')
            .addClass('clicked');

        containers
            .hide()
            .filter('[index~='+index+']')
            .show();
    });






    // MENU - layout-minimize
    $('.editText#input-layout-minimize').val(config.minimizeLayout_filter);
    window._listener.layoutMinimizeFilter = $(document).on('click', '.saveText#button-layout-minimize', function () {
        var element = $(this).prev();
        var value = element.val();

        if( value.length === 0 ) {  // regExp:match anything 예외처리
            config.minimizeLayout_filter = ".nothingElement";
            element.animate({backgroundColor: '#76cc84'}, 50);
            element.animate({backgroundColor: '#ffffff'}, 1000);
            localStorage.config = JSON.stringify(config);
            return;
        }

        element.css('color', 'inherit');
        element.animate({backgroundColor: '#76cc84'}, 50);
        element.animate({backgroundColor: '#ffffff'}, 1000);
        config.minimizeLayout_filter = value;
        localStorage.config = JSON.stringify(config);
    });

    //MENU - blacklist
    window._listener.blacklist_filter_move = $(document).on('click', 'input.saveText.blac', function () {
        // $('.saveText.blac').css('border-bottom', '0px #d0d0d0 solid').css('background', '#3379b730').css('color','#ababab');
        // $(this).css('background', '#fbfbfb').css('border-bottom', '0px #d0d0d0 solid').css('color', '#333');

        $('.saveText.blac').removeClass('selected');
        $(this).addClass('selected');

        var index = $(this).attr('index');
        $('.smallbox.blacklist').hide();
        $('.smallbox.blacklist.'+index).show();

    });
    $('.saveText.blac.nickname').trigger('click');
    window._listener.blkacklist_save = $(document).on('click', '.saveText.blacklist', function () {
        let d = this.classList[2];
        console.log(d);
        let value = $('textarea.blacklist.'+d).val();

        let element = $('.box.child.blacklist, textarea.blacklist.'+d);
        value = value.replace(/[\n\r]+/g, '|');
        console.log(value);
        if(value[value.length-1] === '|') { value = value.slice(0,value.length-2)}

        if( value.length === 0 ) {  // regExp:match anything 예외처리
            config.blacklist_filter[d] = "a^";
            localStorage.config = JSON.stringify(config);
            element.animate({backgroundColor: '#76cc84'}, 50);
            element.animate({backgroundColor: '#fbfbfb'}, 1000);
            return;
        }
        try {
            var z = new RegExp(value);
            element.css('color', 'inherit');
            element.animate({backgroundColor: '#76cc84'}, 50);
            element.animate({backgroundColor: '#fbfbfb'}, 1000);
        }
        catch (e) {
            console.log(e);
            $(element).animate({backgroundColor: '#f1a39e'}, 50);
            $(element).effect( 'shake', {distance:4, times:6});
            $(element).animate({backgroundColor: '#fbfbfb'}, 1000);
            //alert(e+'\n'+'잘못된 정규표현식입니다. 저장되지 않았습니다.');
            return;
        }

        config.blacklist_filter[d] = value;
        localStorage.config = JSON.stringify(config);

    });
    window._listener.textarea_save_blacklist = $(document).on('keydown', "textarea.blacklist", function(evnet){
        if(event.keyCode === 13 && event.shiftKey){
            let tag1 = '.'+this.classList[1];
            let tag2 = '.'+this.classList[2];
            $('.saveText'+tag1+tag2).trigger('click');
            event.preventDefault();
            event.stopPropagation();
        }
    });


    //MENU - userMemo
    window._listener.usermemo_save = $(document).on('click', '.saveText.userMemo', function () {
        var textArea = $('.editText.userMemo');
        var z = $('.box.child.userMemo, .editText.userMemo');
        z.css('color', 'inherit');
        z.animate({backgroundColor: '#76cc84'}, 50);
        z.animate({backgroundColor: '#fbfbfb'}, 1000);
        config.userMemo_filter = textArea.val();
        localStorage.config = JSON.stringify(config);
    });
    window._listener.textarea_save_usermemo = $(document).on('keydown', "textarea.userMemo", function(evnet){
        if(event.keyCode === 13 && event.shiftKey){
            let tag = '.'+this.classList[1];
            $('.saveText.userMemo.save').trigger('click');
            event.preventDefault();
            event.stopPropagation();
        }
    });


    window._listener.bootstrap = $(document).on('switchChange.bootstrapSwitch', '.toggler', function (event, state) {
        var key = $(this).attr('t');
        var value = state;

        config[key] = value;
        localStorage.config = JSON.stringify(config);

        if($(this).attr('haveChildren') != null) {
            $(this).parents('.box').next().slideToggle();
        }
    });

    window._listener.blkacklist_save = $(document).on('click', '.saveText[tag=blacklist]', function () {
        var key = $(this).attr('id');
        var element = $(this).prev();
        var value = element.val();

        if( value.length === 0 ) {  // regExp:match anything 예외처리
            config.blacklist_filter[key] = "a^";
            localStorage.config = JSON.stringify(config);
            element.animate({backgroundColor: '#76cc84'}, 50);
            element.animate({backgroundColor: '#ffffff'}, 1000);
            return;
        }
        try {
            var z = new RegExp(value);
            element.css('color', 'inherit');
            element.animate({backgroundColor: '#76cc84'}, 50);
            element.animate({backgroundColor: '#ffffff'}, 1000);
        }
        catch (e) {
            console.log(e);
            $(element).animate({backgroundColor: '#f1a39e'}, 50);
            $(element).effect( 'shake', {distance:4, times:6});
            $(element).animate({backgroundColor: '#ffffff'}, 1000);
            //alert(e+'\n'+'잘못된 정규표현식입니다. 저장되지 않았습니다.');
            return;
        }
        config.blacklist_filter[key] = value;
        localStorage.config = JSON.stringify(config);
    });

    window._listener.enter_to_save = $(document).on('keydown', "input[class~=editText]", function (event) {
        if(event.keyCode === 13){
            $(this).next().trigger('click');
        }
    });

    // window._listener.textarea_save = $(document).on('keydown', "textarea[class~=editText]", function(evnet){
    //     if(event.keyCode === 13 && event.shiftKey){
    //         $(this).next().trigger('click');
    //         event.preventDefault();
    //         event.stopPropagation();
    //     }
    //
    // });


    // default setting > set autoInsertImage
    document.querySelector('.image-name').innerHTML = new LS().get('autoInsertImageData').value.filename || '설정된 이미지 파일이 없습니다';

    document.querySelector('.upload-image-delegator').addEventListener('click', function (e) {
       document.querySelector('#upload-image').click();
    });

    document.querySelector('.upload-image-deletor').addEventListener('click', function (e) {
        localStorage.autoInsertImageData = "{}";
        document.querySelector('.image-name').innerHTML = "설정된 이미지 파일이 없습니다";
    });

    document.querySelector('#upload-image').addEventListener('change', function (evnet) {
        console.log('onchange');
        let file = event.target.files[0];
        let reader = new FileReader();
        let imageData = {};
        reader.onload = function(event) {
            console.log(event.target.result);
            imageData.filebyte = event.target.result;
            imageData.filetype = file.type;
            imageData.filename = file.name;
            localStorage.autoInsertImageData = JSON.stringify(imageData);
            document.querySelector('.image-name').innerHTML = file.name;
        };
        if (file) {
            reader.readAsDataURL(file);
        }
    });

    // menu-container >> statistics
    $(document).on('click', '#so-clear', function () {
        let confirmWindow = confirm("기록을 삭제하시겠습니까?");
        if (confirmWindow) {
            egypt.clear();
            chart.destroy();
            chart = new setupChart($('#weekly-chart'), 7);
            monthChart.destroy();
            monthChart = new setupChart($('#monthly-chart'), 30);
            doughnutChart.destroy();
            doughnutChart = new setupDoughnutChart($('#doughnut-chart'));
        }
        else {
        }
    });

    $(document).on('click', '#so-refresh', function () {
        chart.destroy();
        chart = new setupChart($('#weekly-chart'), 7);
        monthChart.destroy();
        monthChart = new setupChart($('#monthly-chart'), 30);
        doughnutChart.destroy();
        doughnutChart = new setupDoughnutChart($('#doughnut-chart'));
    });
});





