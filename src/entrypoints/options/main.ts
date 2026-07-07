import '@fontsource/noto-sans-kr/korean-100.css';
import '@fontsource/noto-sans-kr/korean-300.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './style.css';
import Chart from 'chart.js/auto';
import { getConfig, saveConfig } from '@/lib/storage';
import { groupByDay, groupByGall, clearHistory, isHistoryStore, type HistoryStore } from '@/lib/stats';
import TLN from '@/lib/tln';
import type { AppConfig } from '@/lib/default-config';

const updateDescription = '업데이트되었습니다 변경사항을 확인해주세요';

let config: AppConfig;
let version;
let history: HistoryStore = {};

interface AutoInsertImageData {
    filename?: string;
}

function isAutoInsertImageData(value: unknown): value is AutoInsertImageData {
    return typeof value === 'object' && value !== null;
}

function qs(selector, root = document) {
    return root.querySelector(selector);
}

function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
}

function delegate(root, eventName, selector, handler) {
    root.addEventListener(eventName, function (event) {
        if (!(event.target instanceof Element)) return;
        const target = event.target.closest(selector);
        if (!target || (root !== document && !root.contains(target))) return;
        handler.call(target, event, target);
    });
}

function toElements(target) {
    if (target == null) return [];
    if (typeof target === 'string') return qsa(target);
    if (target instanceof Element) return [target];
    if (target instanceof NodeList || target instanceof HTMLCollection || Array.isArray(target)) return Array.from(target).filter(Boolean);
    return [];
}

function setDisplay(target, visible) {
    for (const el of toElements(target)) el.style.display = visible ? '' : 'none';
}

function trigger(element, eventName) {
    if (!element) return;
    element.dispatchEvent(new Event(eventName, { bubbles: true, cancelable: true }));
}

async function readHistory() {
    const { history: storedHistory } = await chrome.storage.local.get('history');
    return isHistoryStore(storedHistory) ? storedHistory : {};
}

async function saveCurrentConfig() {
    await saveConfig(config);
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
                legend: { display: false, labels: { color: 'rgb(255, 99, 132)' } },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                x: { grid: { display: false } },
                'y-a1': { type:'linear', position: 'left', beginAtZero: true, suggestedMax:getMax(data.view)+530 },
                'y-a2': { type:'linear', position:'right', beginAtZero: true, suggestedMax:getMax(data.write)+130, grid: { drawOnChartArea: false } }
            }
        }
    });

    function getLabels(range) {
        const keys = Object.keys(history);
        const output = [];
        for (let index = 0; index < keys.length; index++) {
            output.push(keys[index].replace('d', '').replace('/', '-'));
            if (range && index + 1 === range) break;
        }
        return output.reverse();
    }

    function getValues(range) {
        const grouped = groupByDay(history);
        const output = {'view': [], 'write': [], 'reply': []};
        let count = 0;
        for (const value of Object.values(grouped)) {
            output.view.push(value.view);
            output.write.push(value.write);
            output.reply.push(value.reply);
            count++;
            if(range && count === range) break;
        }
        output.view.reverse();
        output.write.reverse();
        output.reply.reverse();
        return output;
    }

    function getMax(numArray) {
        if (numArray.length === 0) return 0;
        return Math.max.apply(null, numArray);
    }
    function getSum() {
        const grouped = groupByDay(history);
        const sum = {'view': 0, 'write': 0, 'reply': 0};
        for (const value of Object.values(grouped)) {
            sum.view += value.view;
            sum.write += value.write;
            sum.reply += value.reply;
        }
        return sum;
    }

    const total = getSum();
    qs('.view-box-part-detail.view').textContent = total.view;
    qs('.view-box-part-detail.write').textContent = total.write;
    qs('.view-box-part-detail.reply').textContent = total.reply;

    return myChart;
}

function setupDoughnutChart(ctx) {
    const grouped = groupByGall(history);
    const label = [];
    const data = {'view': [], 'write': [], 'reply': []};
    for (const value of Object.values(grouped)) {
        label.push(value.name);
        data.view.push(value.view);
        data.write.push(value.write);
        data.reply.push(value.reply);
    }

    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: label,
            datasets: [
                { label: 'My First Dataset', data: data.view, backgroundColor: ['#ff6384', '#ff9f43', '#ffcd59', '#4bc0c0', '#38a2ea', '#9a68fe', '#c9cbcf'] },
                { label: 'My First Dataset', data: data.write, backgroundColor: ['#ff6384', '#ff9f43', '#ffcd59', '#4bc0c0', '#38a2ea', '#9a68fe', '#c9cbcf'] },
                { label: 'My First Dataset', data: data.reply, backgroundColor: ['#ff6384', '#ff9f43', '#ffcd59', '#4bc0c0', '#38a2ea', '#9a68fe', '#c9cbcf'] }
            ]
        },
        options: {
            plugins: {
                legend: { display: false, labels: { color: 'rgb(255, 99, 132)' } },
                tooltip: { bodyFont: { size: 22 }, displayColors: false }
            }
        }
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

    qs('.editText.blacklist.id').value = id;
    qs('.editText.blacklist.ip').value = ip;
    qs('.editText.blacklist.nickname').value = nickname;
    qs('.editText.blacklist.keyword').value = keyword;

    TLN.append_line_numbers('tln-blacklist-id');
    TLN.append_line_numbers('tln-blacklist-ip');
    TLN.append_line_numbers('tln-blacklist-nickname');
    TLN.append_line_numbers('tln-blacklist-keyword');

    qsa('.editText.blacklist').forEach(growTextarea);
    qsa('.smallbox.blacklist:not(.nickname)').forEach((element) => element.style.display = 'none');
}

function initUsermemo() {
    const textarea = qs('textarea.userMemo');
    textarea.value = config.userMemo_filter;
    TLN.append_line_numbers('tln-userMemo');
    growTextarea(textarea);
    if (getComputedStyle(textarea).height === '0px') textarea.style.height = '72px';
}

function initBootStrapButton() {
    qsa('.toggler:not(.sub-option)').forEach(function (elem) {
        const key = elem.getAttribute('t');
        const value = config[key];
        elem.checked = Boolean(value);

        if(elem.getAttribute('haveChildren') != null && elem.checked === false) {
            const childBox = elem.closest('.box')?.nextElementSibling;
            if (childBox) childBox.style.display = 'none';
        }
    });

    qsa('div[class^=menu-container]:not([index="0"])').forEach((element) => element.style.display = 'none');
}

async function addUpdateNotification(innerText) {
    const { updateChk } = await chrome.storage.local.get('updateChk');
    if(!updateChk) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'update-notification upn-container';
    wrapper.innerHTML = '<div class="upn-title"><i class="fas fa-info-circle" style="margin-right: 10px"></i>v.'+version+'_updatelog</div>' +
        '<div class="upn-close-button"><i class="fas fa-times" id="close"></i></div>' +
        '<div class="upn-detail">'+innerText+'</div>';
    document.body.append(wrapper);

    wrapper.addEventListener('click', async function (event) {
        wrapper.remove();
        await chrome.storage.local.set({ updateChk: false });
        const target = event.target instanceof Element ? event.target : null;
        if( target?.id !== 'close') qs('.item[index="5"]')?.click();
    });
}

function addFootprint() {
    document.body.insertAdjacentHTML('beforeend', '<div id="footPrint">dcsimpler | '+version+'</div>');
}

async function loadUpdatelog() {
    try {
        const response = await fetch('https://sites.google.com/view/dcsimpler/');
        const text = await response.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const main = doc.querySelector('div[role=main]');
        if (main) qs('#updatelog')?.append(main);
    }
    catch (e) {
    }
}

function growTextarea(elem) {
    if (!elem) return;
    const offset = elem.offsetHeight - elem.clientHeight;
    const resizeTextarea = function(element) {
        const scrollRoot = document.scrollingElement ?? document.documentElement ?? document.body;
        const scrollLeft = window.pageXOffset || scrollRoot.scrollLeft;
        const scrollTop  = window.pageYOffset || scrollRoot.scrollTop;
        element.style.height = 'auto';
        element.style.height = (element.scrollHeight + offset) + 'px';
        window.scrollTo(scrollLeft, scrollTop);
    };
    elem.addEventListener('input', function() {
        resizeTextarea(elem);
    });
    resizeTextarea(elem);
}

function testfield(obj) {
    const filter = config.blacklist_filter;
    Object.keys(filter).forEach(function (elem) {
        if (!obj[elem]) return;
        const frag = document.createDocumentFragment();
        const arr = filter[elem].split('|');
        const info = document.createElement('div');
        info.className = 'data-info';
        info.textContent = filter[elem].length;
        const info2 = document.createElement('div');
        info2.className = 'data-info2';
        info2.textContent = arr.length;
        frag.append(info, info2);
        arr.forEach(function (cuv) {
            const item = document.createElement('div');
            item.className = 'fragments';
            item.textContent = cuv + ' ';
            frag.append(item);
        });
        obj[elem].append(frag);
    });
}

function bindOptionHandlers(charts) {
    delegate(document, 'click', '.item', function () {
        const index = this.getAttribute('index');
        if(this.getAttribute('pageMove') != null) {window.open('https://chrome.google.com/webstore/detail/dcsimpler/kgpiejjjpjkcijopeabfleliifbhfnci?hl=ko'); return;}

        qsa('.item').forEach((item) => item.classList.toggle('clicked', item.getAttribute('index') === index));
        qsa('.menu-container').forEach((container) => setDisplay(container, container.getAttribute('index') === index));
    });

    qs('.editText#input-layout-minimize').value = config.minimizeLayout_filter;
    delegate(document, 'click', '.saveText#button-layout-minimize', async function () {
        const element = this.previousElementSibling;
        const value = element.value;
        if( value.length === 0 ) {
            config.minimizeLayout_filter = '.nothingElement';
            flashOk(element);
            await saveCurrentConfig();
            return;
        }

        element.style.color = 'inherit';
        flashOk(element);
        config.minimizeLayout_filter = value;
        await saveCurrentConfig();
    });

    delegate(document, 'click', 'input.saveText.blac', function () {
        qsa('.saveText.blac').forEach((button) => button.classList.remove('selected'));
        this.classList.add('selected');

        const index = this.getAttribute('index');
        qsa('.smallbox.blacklist').forEach((box) => setDisplay(box, false));
        qsa('.smallbox.blacklist.'+index).forEach((box) => setDisplay(box, true));
    });
    qs('.saveText.blac.nickname')?.click();

    delegate(document, 'click', '.saveText.blacklist', async function () {
        const d = this.classList[2];
        const textarea = qs('textarea.blacklist.'+d);
        let value = textarea.value;
        const element = [qs('.box.child.blacklist'), textarea];
        value = value.replace(/[\n\r]+/g, '|');
        if(value[value.length-1] === '|') value = value.slice(0,value.length-1);

        if( value.length === 0 ) {
            config.blacklist_filter[d] = 'a^';
            await saveCurrentConfig();
            flashOk(element);
            return;
        }
        try {
            new RegExp(value);
            element.forEach((el) => { if (el) el.style.color = 'inherit'; });
            flashOk(element);
        }
        catch (e) {
            flashErr(element);
            return;
        }

        config.blacklist_filter[d] = value;
        await saveCurrentConfig();
    });

    delegate(document, 'keydown', 'textarea.blacklist', function(event){
        if(event.key === 'Enter' && event.shiftKey){
            qs('.saveText.'+this.classList[1]+'.'+this.classList[2])?.click();
            event.preventDefault();
            event.stopPropagation();
        }
    });

    delegate(document, 'click', '.saveText.userMemo.save', async function () {
        const textArea = qs('.editText.userMemo');
        const targets = [qs('.box.child.userMemo'), textArea];
        targets.forEach((el) => { if (el) el.style.color = 'inherit'; });
        flashOk(targets);
        config.userMemo_filter = textArea.value;
        await saveCurrentConfig();
    });

    delegate(document, 'keydown', 'textarea.userMemo', function(event){
        if(event.key === 'Enter' && event.shiftKey){
            qs('.saveText.userMemo.save')?.click();
            event.preventDefault();
            event.stopPropagation();
        }
    });

    function findSectionTextarea(button) {
        const section = button.closest('.smallbox') || button.closest('.box.child');
        return section ? section.querySelector('textarea') : null;
    }
    function exportFilename(textarea) {
        const classes = Array.from(textarea.classList).filter(function (c) { return c !== 'editText'; });
        const suffix = classes.length ? classes.join('-') : 'filter';
        return 'dcsimpler-' + suffix + '.txt';
    }

    delegate(document, 'click', '.saveText.export', function () {
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

    delegate(document, 'click', '.saveText.import', function () {
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
                trigger(textarea, 'input');
                flashOk(textarea);
            };
            reader.onerror = function () { alert('파일을 불러오지 못했습니다.'); };
            reader.readAsText(file);
        });
        picker.click();
    });

    document.addEventListener('change', async function (event) {
        if (!(event.target instanceof HTMLInputElement) || !event.target.matches('.toggler')) return;
        const key = event.target.getAttribute('t');
        const value = event.target.checked;

        config[key] = value;
        await saveCurrentConfig();

        if(event.target.getAttribute('haveChildren') != null) {
            const childBox = event.target.closest('.box')?.nextElementSibling;
            if (childBox instanceof HTMLElement) childBox.style.display = value ? '' : 'none';
        }
    });

    delegate(document, 'keydown', 'input.editText', function (event) {
        if(event.key === 'Enter') this.nextElementSibling?.click();
    });

    qs('.upload-image-delegator')?.addEventListener('click', function () { qs('#upload-image')?.click(); });
    qs('.upload-image-deletor')?.addEventListener('click', async function () {
        await chrome.storage.local.set({ autoInsertImageData: {} });
        qs('.image-name').innerHTML = '설정된 이미지 파일이 없습니다';
    });

    qs('#upload-image')?.addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (!file) return;
        const MAX_IMAGE_BYTES = 7 * 1024 * 1024;
        if (file.size > MAX_IMAGE_BYTES) {
            alert('이미지 용량이 너무 큽니다. 7MB 이하 파일을 사용해주세요.');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        const imageData: { filebyte?: string | ArrayBuffer | null; filetype?: string; filename?: string } = {};
        reader.onload = async function(event) {
            imageData.filebyte = event.target.result;
            imageData.filetype = file.type;
            imageData.filename = file.name;
            try {
                await chrome.storage.local.set({ autoInsertImageData: imageData });
                qs('.image-name').innerHTML = file.name;
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
        charts.chart = setupChart(qs('#weekly-chart'), 7);
        charts.monthChart.destroy();
        charts.monthChart = setupChart(qs('#monthly-chart'), 30);
        charts.doughnutChart.destroy();
        charts.doughnutChart = setupDoughnutChart(qs('#doughnut-chart'));
    };

    delegate(document, 'click', '#so-clear', async function () {
        const confirmWindow = confirm('기록을 삭제하시겠습니까?');
        if (confirmWindow) {
            await clearHistory(30);
            await recreateCharts();
        }
    });

    delegate(document, 'click', '#so-refresh', async function () {
        await recreateCharts();
    });
}

async function initOptions() {
    config = await getConfig();
    history = await readHistory();
    version = chrome.runtime.getManifest().version;
    const bg = qs('#bg');
    if (bg) {
        bg.style.opacity = '0';
        bg.style.zIndex = '-999';
    }
    qs('#footer').innerHTML = 'dcsimpler_v.'+version;
    qs('.menu-container[index="5"] p')?.insertAdjacentHTML('afterbegin', '<p>ver.'+version+'</p>');
    await addUpdateNotification(updateDescription);
    initUsermemo();
    initBlacklist();
    initBootStrapButton();
    addFootprint();
    loadUpdatelog();

    const charts = {
        chart: setupChart(qs('#weekly-chart'), 7),
        monthChart: setupChart(qs('#monthly-chart'), 30),
        doughnutChart: setupDoughnutChart(qs('#doughnut-chart'))
    };

    testfield({
        nickname : qs('.test-field.nickname'),
        id : qs('.test-field.id'),
        ip : qs('.test-field.ip'),
        keyword : qs('.test-field.keyword')
    });

    qs('#goShortCut')?.addEventListener('click', function() {
        chrome.tabs.create({url:'chrome://extensions/shortcuts'});
    });

    const { autoInsertImageData } = await chrome.storage.local.get('autoInsertImageData');
    qs('.image-name').innerHTML = isAutoInsertImageData(autoInsertImageData) && autoInsertImageData.filename
        ? autoInsertImageData.filename
        : '설정된 이미지 파일이 없습니다';

    bindOptionHandlers(charts);
}

document.addEventListener('DOMContentLoaded', function () {
    initOptions().catch(function (e) {
        console.error(e);
    });
});
