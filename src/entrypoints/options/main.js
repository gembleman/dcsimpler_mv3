import '@/lib/jquery-global';
import '@fontsource/noto-sans-kr/korean-100.css';
import '@fontsource/noto-sans-kr/korean-300.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './style.css';
import Chart from 'chart.js/auto';
import { getConfig, saveConfig } from '@/lib/storage';
import { groupByDay, groupByGall, clearHistory } from '@/lib/stats';
import TLN from '@/lib/tln';

const $ = globalThis.$;
const updateDescription = '업데이트되었습니다 변경사항을 확인해주세요';

let config;
let version;
let history = {};

async function readHistory() {
    const { history: storedHistory } = await chrome.storage.local.get('history');
    return storedHistory ?? {};
}

async function saveCurrentConfig() {
    await saveConfig(config);
}

function toElements(target) {
    if (target == null) return [];
    if (typeof target === 'string') return Array.from(document.querySelectorAll(target));
    if (target.jquery) return target.toArray();
    if (target instanceof Element) return [target];
    if (target instanceof NodeList || target instanceof HTMLCollection || Array.isArray(target)) return Array.from(target);
    return [];
}

function applyFlash(target, classNames, duration = 1000) {
    for (const el of toElements(target)) {
        el.style.setProperty('--dcs-flash-bg', getComputedStyle(el).backgroundColor);
        el.classList.remove('dcs-flash-ok', 'dcs-flash-err', 'dcs-shake');
        void el.offsetWidth;
        el.classList.add(...classNames);
        window.setTimeout(function () {
            el.classList.remove(...classNames);
        }, duration);
    }
}

function flashOk(target) {
    applyFlash(target, ['dcs-flash-ok']);
}

function flashErr(target) {
    applyFlash(target, ['dcs-flash-err', 'dcs-shake']);
}

function setupChart(ctx, range) {
    const data = getValues(range);

    Chart.defaults.font.family = 'Noto Sans KR';
    Chart.defaults.font.weight = 'bold';
    const myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: getLabels(range),
            datasets: [
                {
                    label: '게시물 조회',
                    data: data.view,
                    yAxisID: 'y-a1',
                    backgroundColor:'#ffffff00',
                    borderColor: '#337ab7',
                    tension: 0,
                    type:'line',
                    borderWidth: 3,
                    pointRadius: 3,
                    pointBorderWidth: 2,
                    pointBackgroundColor: 'white'
                },
                {
                    label: '글 작성',
                    data: data.write,
                    yAxisID: 'y-a2',
                    backgroundColor:'#ffffff00',
                    borderColor: '#f3bc206b',
                    tension: 0,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointBorderWidth: 2,
                    pointBackgroundColor: 'white'
                },
                {
                    label: '댓글 작성',
                    data: data.reply,
                    yAxisID: 'y-a2',
                    backgroundColor:'#ffffff00',
                    borderColor: '#2eb6238c',
                    tension: 0,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointBorderWidth: 2,
                    pointBackgroundColor: 'white'
                }]
        },
        options: {
            plugins: {
                legend: {
                    display: false,
                    labels: {
                        color: 'rgb(255, 99, 132)'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                'y-a1': {
                    type:'linear',
                    position: 'left',
                    beginAtZero: true,
                    suggestedMax:getMax(data.view)+530
                },
                'y-a2': {
                    type:'linear',
                    position:'right',
                    beginAtZero: true,
                    suggestedMax:getMax(data.write)+130,
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });

    function getLabels(range) {
        const i = Object.keys(history);
        const o = [];
        jQuery.each(i, function(key, value) {
            o.push(value.replace('d', '').replace('/', '-'));
            return key+1 !== range;
        });
        return o.reverse();
    }

    function getValues(range) {
        const i = groupByDay(history);
        const o = {'view': [], 'write': [], 'reply': []};
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
        if (numArray.length === 0) return 0;
        return Math.max.apply(null, numArray);
    }
    function getMin(numArray) {
        if (numArray.length === 0) return 0;
        return Math.min.apply(null, numArray);
    }
    function getSum() {
        const i = groupByDay(history);
        const sum = {'view': 0, 'write': 0, 'reply': 0};
        $.each(i, function(key,value){
            sum.view += value.view;
            sum.write += value.write;
            sum.reply += value.reply;
        });
        return sum;
    }

    const total = getSum();
    $('.view-box-part-detail[class~=view]').html(total.view);
    $('.view-box-part-detail[class~=write]').html(total.write);
    $('.view-box-part-detail[class~=reply]').html(total.reply);

    return myChart;
}

function setupDoughnutChart(ctx) {
    const i = groupByGall(history);
    const label = [];
    const data = {'view': [], 'write': [], 'reply': []};
    $.each(i, function (key, value) {
        label.push(value.name);
        data.view.push(value.view);
        data.write.push(value.write);
        data.reply.push(value.reply);
    });

    const doughnutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            'labels': label,
            'datasets': [
                {
                    'label': 'My First Dataset',
                    'data': data.view,
                    'backgroundColor': ['#ff6384', '#ff9f43', '#ffcd59', '#4bc0c0', '#38a2ea', '#9a68fe', '#c9cbcf']
                },
                {
                    'label': 'My First Dataset',
                    'data': data.write,
                    'backgroundColor': ['#ff6384', '#ff9f43', '#ffcd59', '#4bc0c0', '#38a2ea', '#9a68fe', '#c9cbcf']
                },
                {
                    'label': 'My First Dataset',
                    'data': data.reply,
                    'backgroundColor': ['#ff6384', '#ff9f43', '#ffcd59', '#4bc0c0', '#38a2ea', '#9a68fe', '#c9cbcf']
                }]
        },
        options: {
            plugins: {
                legend: {
                    display: false,
                    labels: {
                        color: 'rgb(255, 99, 132)'
                    }
                },
                tooltip: {
                    bodyFont: { size: 22 },
                    displayColors: false
                }
            }
        }
    });
    return doughnutChart;
}

function initEditText() {
    $.each($('.editText[tag=blacklist]'), function () {
        const id = $(this).attr('id');
        const value = config.blacklist_filter[id];
        if (value === 'a^' || value.length === 0) $(this).val('');
        else $(this).val(value);
    });
}

function initBlacklist() {
    let id = config.blacklist_filter.id;
    let ip = config.blacklist_filter.ip;
    let nickname = config.blacklist_filter.nickname;
    let keyword = config.blacklist_filter.keyword;

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
}

function initUsermemo() {
    const value = config.userMemo_filter;
    $('textarea.userMemo').val(value);
    TLN.append_line_numbers('tln-userMemo');
    $('textarea.userMemo').each(growTextarea);
    if ($('textarea.userMemo').css('height') === '0px') $('textarea.userMemo').css('height', '72px');
}

function initBootStrapButton() {
    document.querySelectorAll('.toggler:not(.sub-option)').forEach(function (elem) {
        const key = elem.getAttribute('t');
        const value = config[key];
        elem.checked = Boolean(value);

        if(elem.getAttribute('haveChildren') != null) {
            if(elem.checked === false) {
                const childBox = elem.closest('.box')?.nextElementSibling;
                if (childBox) childBox.style.display = 'none';
            }
        }
    });

    $('div[class^=menu-container]').not("[index='0']").hide();
}

async function addUpdateNotification(innerText) {
    const { updateChk } = await chrome.storage.local.get('updateChk');
    if(!updateChk) return;
    let updateNoti;
    updateNoti = '<div class="update-notification upn-container">';
    updateNoti += '<div class="upn-title"><i class="fas fa-info-circle" style="margin-right: 10px"/>v.'+version+'_updatelog</div>';
    updateNoti += '<div class="upn-close-button"><i class="fas fa-times" id="close"/></div>';
    updateNoti += '<div class="upn-detail">'+innerText+'</div>';
    $('body').append(updateNoti);

    $(document).on('click', '.update-notification', async function (event) {
        $('.update-notification').remove();
        await chrome.storage.local.set({ updateChk: false });
        if( event.target.id !== 'close') $('.item[index="5"]').trigger('click');
    });
}

function addFootprint() {
    let footPrint='';
    footPrint += '<div id="footPrint">';
    footPrint += 'dcsimpler | '+version;
    $('body').append(footPrint);
}

async function loadUpdatelog() {
    try {
        const response = await fetch('https://sites.google.com/view/dcsimpler/');
        const text = await response.text();
        const nodes = $.parseHTML(text);
        $('#updatelog').append($(nodes).find('div[role=main]'));
    }
    catch (e) {
    }
}

function growTextarea(i, elem) {
    elem = $(elem);
    const offset = elem.prop('offsetHeight') - elem.prop('clientHeight');
    const resizeTextarea = function( elem ) {
        const scrollLeft = window.pageXOffset || (document.documentElement || document.body.parentNode || document.body).scrollLeft;
        const scrollTop  = window.pageYOffset || (document.documentElement || document.body.parentNode || document.body).scrollTop;
        elem.css('height', 'auto').css('height', elem.prop('scrollHeight') );
        window.scrollTo(scrollLeft, scrollTop);
    };
    elem.on('input', function() {
        resizeTextarea( $(this) );
    });
    resizeTextarea( $(elem) );
}

function testfield(obj) {
    const filter = config.blacklist_filter;
    Object.keys(filter).forEach(function (elem) {
        const $frag = $(document.createDocumentFragment());
        const arr = filter[elem].split('|');
        $frag.append('<div class="data-info">' + filter[elem].length + '</div>');
        $frag.append('<div class="data-info2">' + arr.length + '</div>');
        const frag = arr.reduce(function (acc, cuv) {
            acc.append('<div class="fragments">' + cuv + ' </div>');
            return acc;
        }, $frag);
        $(obj[elem]).append(frag);
    });
}

function bindOptionHandlers(charts) {
    $(document).on('click', '.item', function () {
        const index = $(this).attr('index');
        const menus = $('.item');
        const containers = $('.menu-container');
        if($(this).attr('pageMove') != null) {window.open('https://chrome.google.com/webstore/detail/dcsimpler/kgpiejjjpjkcijopeabfleliifbhfnci?hl=ko'); return;}

        menus
            .removeClass('clicked')
            .filter('[index~='+index+']')
            .addClass('clicked');

        containers
            .hide()
            .filter('[index~='+index+']')
            .show();
    });

    $('.editText#input-layout-minimize').val(config.minimizeLayout_filter);
    $(document).on('click', '.saveText#button-layout-minimize', async function () {
        const element = $(this).prev();
        const value = element.val();
        if( value.length === 0 ) {
            config.minimizeLayout_filter = '.nothingElement';
            flashOk(element);
            await saveCurrentConfig();
            return;
        }

        element.css('color', 'inherit');
        flashOk(element);
        config.minimizeLayout_filter = value;
        await saveCurrentConfig();
    });

    $(document).on('click', 'input.saveText.blac', function () {
        $('.saveText.blac').removeClass('selected');
        $(this).addClass('selected');

        const index = $(this).attr('index');
        $('.smallbox.blacklist').hide();
        $('.smallbox.blacklist.'+index).show();
    });
    $('.saveText.blac.nickname').trigger('click');

    $(document).on('click', '.saveText.blacklist', async function () {
        const d = this.classList[2];
        console.log(d);
        let value = $('textarea.blacklist.'+d).val();

        const element = $('.box.child.blacklist, textarea.blacklist.'+d);
        value = value.replace(/[\n\r]+/g, '|');
        console.log(value);
        if(value[value.length-1] === '|') { value = value.slice(0,value.length-1)}

        if( value.length === 0 ) {
            config.blacklist_filter[d] = 'a^';
            await saveCurrentConfig();
            flashOk(element);
            return;
        }
        try {
            const z = new RegExp(value);
            element.css('color', 'inherit');
            flashOk(element);
        }
        catch (e) {
            console.log(e);
            flashErr(element);
            return;
        }

        config.blacklist_filter[d] = value;
        await saveCurrentConfig();
    });

    $(document).on('keydown', 'textarea.blacklist', function(event){
        if(event.keyCode === 13 && event.shiftKey){
            const tag1 = '.'+this.classList[1];
            const tag2 = '.'+this.classList[2];
            $('.saveText'+tag1+tag2).trigger('click');
            event.preventDefault();
            event.stopPropagation();
        }
    });

    $(document).on('click', '.saveText.userMemo.save', async function () {
        const textArea = $('.editText.userMemo');
        const z = $('.box.child.userMemo, .editText.userMemo');
        z.css('color', 'inherit');
        flashOk(z);
        config.userMemo_filter = textArea.val();
        await saveCurrentConfig();
    });

    $(document).on('keydown', 'textarea.userMemo', function(event){
        if(event.keyCode === 13 && event.shiftKey){
            $('.saveText.userMemo.save').trigger('click');
            event.preventDefault();
            event.stopPropagation();
        }
    });

    // 내보내기/가져오기 — 버튼이 속한 섹션(.smallbox 또는 .box.child)의 textarea를 대상으로 한다.
    function findSectionTextarea(button) {
        const section = button.closest('.smallbox') || button.closest('.box.child');
        return section ? section.querySelector('textarea') : null;
    }
    function exportFilename(textarea) {
        // 예: "editText blacklist ip" → "dcsimpler-blacklist-ip.txt"
        const classes = Array.from(textarea.classList).filter(function (c) { return c !== 'editText'; });
        const suffix = classes.length ? classes.join('-') : 'filter';
        return 'dcsimpler-' + suffix + '.txt';
    }

    $(document).on('click', '.saveText.export', function () {
        const textarea = findSectionTextarea(this);
        if (!textarea) return;
        const blob = new Blob([textarea.value], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = exportFilename(textarea);
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    });

    $(document).on('click', '.saveText.import', function () {
        const textarea = findSectionTextarea(this);
        if (!textarea) return;
        const picker = document.createElement('input');
        picker.type = 'file';
        picker.accept = '.txt,text/plain';
        picker.addEventListener('change', function () {
            const file = picker.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function () {
                textarea.value = String(reader.result).replace(/\r\n/g, '\n');
                $(textarea).trigger('input'); // 라인번호·높이 갱신
                flashOk(textarea);
            };
            reader.onerror = function () {
                alert('파일을 불러오지 못했습니다.');
            };
            reader.readAsText(file);
        });
        picker.click();
    });

    document.addEventListener('change', async function (event) {
        if (!event.target.matches('.toggler')) return;
        const key = event.target.getAttribute('t');
        const value = event.target.checked;

        config[key] = value;
        await saveCurrentConfig();

        if(event.target.getAttribute('haveChildren') != null) {
            const childBox = event.target.closest('.box')?.nextElementSibling;
            if (childBox) childBox.style.display = value ? '' : 'none';
        }
    });

    $(document).on('click', '.saveText[tag=blacklist]', async function () {
        const key = $(this).attr('id');
        const element = $(this).prev();
        const value = element.val();

        if( value.length === 0 ) {
            config.blacklist_filter[key] = 'a^';
            await saveCurrentConfig();
            flashOk(element);
            return;
        }
        try {
            const z = new RegExp(value);
            element.css('color', 'inherit');
            flashOk(element);
        }
        catch (e) {
            console.log(e);
            flashErr(element);
            return;
        }
        config.blacklist_filter[key] = value;
        await saveCurrentConfig();
    });

    $(document).on('keydown', 'input[class~=editText]', function (event) {
        if(event.keyCode === 13){
            $(this).next().trigger('click');
        }
    });

    document.querySelector('.upload-image-delegator').addEventListener('click', function () {
       document.querySelector('#upload-image').click();
    });

    document.querySelector('.upload-image-deletor').addEventListener('click', async function () {
        await chrome.storage.local.set({ autoInsertImageData: {} });
        document.querySelector('.image-name').innerHTML = '설정된 이미지 파일이 없습니다';
    });

    document.querySelector('#upload-image').addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (!file) return;

        // data URL(base64)은 원본보다 약 33% 크고, chrome.storage.local의
        // 기본 용량(약 10MB)을 넘으면 set()이 조용히 실패한다. 미리 검증한다.
        const MAX_IMAGE_BYTES = 7 * 1024 * 1024; // 원본 7MB → data URL 약 9.3MB
        if (file.size > MAX_IMAGE_BYTES) {
            alert('이미지 용량이 너무 큽니다. 7MB 이하 파일을 사용해주세요.');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        const imageData = {};
        reader.onload = async function(event) {
            imageData.filebyte = event.target.result;
            imageData.filetype = file.type;
            imageData.filename = file.name;
            try {
                await chrome.storage.local.set({ autoInsertImageData: imageData });
                document.querySelector('.image-name').innerHTML = file.name;
            } catch (e) {
                console.error(e);
                alert('이미지를 저장하지 못했습니다. 파일 용량을 줄여 다시 시도해주세요.');
            }
        };
        reader.readAsDataURL(file);
    });

    const recreateCharts = async function () {
        history = await readHistory();
        charts.chart.destroy();
        charts.chart = setupChart(document.getElementById('weekly-chart'), 7);
        charts.monthChart.destroy();
        charts.monthChart = setupChart(document.getElementById('monthly-chart'), 30);
        charts.doughnutChart.destroy();
        charts.doughnutChart = setupDoughnutChart(document.getElementById('doughnut-chart'));
    };

    $(document).on('click', '#so-clear', async function () {
        const confirmWindow = confirm('기록을 삭제하시겠습니까?');
        if (confirmWindow) {
            await clearHistory(30);
            await recreateCharts();
        }
        else {
        }
    });

    $(document).on('click', '#so-refresh', async function () {
        await recreateCharts();
    });
}

async function initOptions() {
    config = await getConfig();
    history = await readHistory();
    version = chrome.runtime.getManifest().version;
    $('#bg').css('opacity','0').css('z-index','-999');
    $('#footer').html('dcsimpler_v.'+version);
    $('.menu-container[index="5"] p').first().prepend('<p>ver.'+version+'</p>');
    await addUpdateNotification(updateDescription);
    initEditText();
    initUsermemo();
    initBlacklist();
    initBootStrapButton();
    addFootprint();
    loadUpdatelog();

    const charts = {
        chart: setupChart(document.getElementById('weekly-chart'), 7),
        monthChart: setupChart(document.getElementById('monthly-chart'), 30),
        doughnutChart: setupDoughnutChart(document.getElementById('doughnut-chart'))
    };

    testfield({
        nickname : document.querySelector('.test-field.nickname'),
        id : document.querySelector('.test-field.id'),
        ip : document.querySelector('.test-field.ip'),
        keyword : document.querySelector('.test-field.keyword')
    });

    document.getElementById('goShortCut').addEventListener('click', function() {
        chrome.tabs.create({url:'chrome://extensions/shortcuts'});
    });

    const { autoInsertImageData = {} } = await chrome.storage.local.get('autoInsertImageData');
    document.querySelector('.image-name').innerHTML = autoInsertImageData.filename || '설정된 이미지 파일이 없습니다';

    bindOptionHandlers(charts);
}

document.addEventListener('DOMContentLoaded', function () {
    initOptions().catch(function (e) {
        console.error(e);
    });
});
