import '@fontsource/noto-sans-kr/korean-100.css';
import '@fontsource/noto-sans-kr/korean-300.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './style.css';
import Chart from 'chart.js/auto';
import type { ChartItem } from 'chart.js';
import { getConfig, saveConfig } from '@/lib/storage';
import { groupByDay, groupByGall, clearHistory, isHistoryStore, type HistoryStore } from '@/lib/stats';
import TLN from '@/lib/tln';
import type { AppConfig, BlacklistFilterKey } from '@/lib/default-config';

const updateDescription = '업데이트되었습니다 변경사항을 확인해주세요';

let config: AppConfig;
let version = '';
let history: HistoryStore = {};

interface AutoInsertImageData {
    filebyte?: string;
    filetype?: string;
    filename?: string;
}

function isAutoInsertImageData(value: unknown): value is AutoInsertImageData {
    if (typeof value !== 'object' || value === null) return false;
    const record = value as Record<string, unknown>;
    return (record.filebyte === undefined || typeof record.filebyte === 'string')
        && (record.filetype === undefined || typeof record.filetype === 'string')
        && (record.filename === undefined || typeof record.filename === 'string');
}

type QueryRoot = Document | DocumentFragment | Element;
type ElementTarget =
    | string
    | Element
    | ArrayLike<Element | null | undefined>
    | Iterable<Element | null | undefined>
    | null
    | undefined;
type StatSeries = Record<'view' | 'write' | 'reply', number[]>;
type StatTotals = Record<'view' | 'write' | 'reply', number>;
type OptionsCharts = {
    chart: InstanceType<typeof Chart>;
    monthChart: InstanceType<typeof Chart>;
    doughnutChart: InstanceType<typeof Chart>;
};

const blacklistKeys = ['id', 'ip', 'nickname', 'keyword'] as const satisfies readonly BlacklistFilterKey[];
const booleanConfigKeys = [
    'autoRefreshImage',
    'blacklist',
    'blacklist_view',
    'blacklist_notice',
    'blurImage',
    'directView',
    'minimizeLayout',
    'addRightSideVisitHistory',
    'upScale',
    'userMemo',
    'autoInsertImage',
    'alignLeftContentWriter',
] as const satisfies readonly (keyof AppConfig)[];
type BooleanConfigKey = typeof booleanConfigKeys[number];

function qs<T extends Element = HTMLElement>(selector: string, root: QueryRoot = document): T | null {
    return root.querySelector<T>(selector);
}

function qsa<T extends Element = HTMLElement>(selector: string, root: QueryRoot = document): T[] {
    return Array.from(root.querySelectorAll<T>(selector));
}

function delegate<T extends Element = HTMLElement, E extends Event = Event>(
    root: QueryRoot,
    eventName: string,
    selector: string,
    handler: (this: T, event: E, target: T) => void,
): void {
    root.addEventListener(eventName, function (event) {
        if (!(event.target instanceof Element)) return;
        const target = event.target.closest(selector);
        if (!target || (root !== document && !root.contains(target))) return;
        handler.call(target as T, event as E, target as T);
    });
}

function isBlacklistFilterKey(value: string | undefined): value is BlacklistFilterKey {
    return value !== undefined && blacklistKeys.includes(value as BlacklistFilterKey);
}

function isBooleanConfigKey(value: string | null): value is BooleanConfigKey {
    return value !== null && booleanConfigKeys.includes(value as BooleanConfigKey);
}

function toElements(target: ElementTarget): HTMLElement[] {
    if (target == null) return [];
    if (typeof target === 'string') return qsa(target);
    if (target instanceof HTMLElement) return [target];
    if (target instanceof Element) return [];
    if (target instanceof NodeList || target instanceof HTMLCollection || Array.isArray(target)) {
        return Array.from(target).filter((element): element is HTMLElement => element instanceof HTMLElement);
    }
    return Array.from(target).filter((element): element is HTMLElement => element instanceof HTMLElement);
}

function getTextFromFileReader(reader: FileReader): string | null {
    return typeof reader.result === 'string' ? reader.result : null;
}

function getFileInput(event: Event): HTMLInputElement | null {
    return event.target instanceof HTMLInputElement ? event.target : null;
}

function getFileReader(event: ProgressEvent<FileReader>): FileReader | null {
    return event.target instanceof FileReader ? event.target : null;
}

function getPreviousInput(element: Element): HTMLInputElement | null {
    return element.previousElementSibling instanceof HTMLInputElement ? element.previousElementSibling : null;
}

function getImageDataFromReader(reader: FileReader, file: File): AutoInsertImageData | null {
    const result = reader.result;
    if (typeof result !== 'string') return null;
    return {
        filebyte: result,
        filetype: file.type,
        filename: file.name
    };
}

function setText(selector: string, value: string | number): void {
    const element = qs(selector);
    if (element) element.textContent = String(value);
}

function setTextareaValue(selector: string, value: string): void {
    const textarea = qs<HTMLTextAreaElement>(selector);
    if (textarea) textarea.value = value;
}

function setInputValue(selector: string, value: string): void {
    const input = qs<HTMLInputElement>(selector);
    if (input) input.value = value;
}

function readFileText(file: File, onLoad: (text: string) => void): void {
    const reader = new FileReader();
    reader.onload = function () {
        const text = getTextFromFileReader(reader);
        if (text === null) {
            alert('텍스트 파일만 가져올 수 있습니다.');
            return;
        }
        onLoad(text);
    };
    reader.onerror = function () { alert('파일을 불러오지 못했습니다.'); };
    reader.readAsText(file);
}

function normalizeImportedText(text: string): string {
    return text.replace(/\r\n/g, '\n');
}

function trigger(element: EventTarget | null | undefined, eventName: string): void {
    if (!element) return;
    element.dispatchEvent(new Event(eventName, { bubbles: true, cancelable: true }));
}

function setDisplay(target: ElementTarget, visible: boolean): void {
    for (const el of toElements(target)) el.style.display = visible ? '' : 'none';
}

function applyFlash(target: ElementTarget, classNames: string[], duration = 1000): void {
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

function flashOk(target: ElementTarget): void {
    applyFlash(target, ['dcs-flash-ok']);
}

function flashErr(target: ElementTarget): void {
    applyFlash(target, ['dcs-flash-err', 'dcs-shake']);
}

function showElementError(target: ElementTarget): void {
    for (const el of toElements(target)) el.style.color = 'inherit';
}

function findSectionTextarea(button: Element): HTMLTextAreaElement | null {
    const section = button.closest('.smallbox') || button.closest('.box.child');
    return section ? section.querySelector<HTMLTextAreaElement>('textarea') : null;
}

function exportFilename(textarea: HTMLTextAreaElement): string {
    const classes = Array.from(textarea.classList).filter(function (c) { return c !== 'editText'; });
    const suffix = classes.length ? classes.join('-') : 'filter';
    return 'dcsimpler-' + suffix + '.txt';
}

function downloadTextFile(filename: string, text: string): void {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function importTextFile(onLoad: (text: string) => void): void {
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = '.txt,text/plain';
    picker.addEventListener('change', function () {
        const file = picker.files?.[0];
        if (!file) return;
        readFileText(file, onLoad);
    });
    picker.click();
}

function getCanvas(selector: string): HTMLCanvasElement {
    const canvas = qs<HTMLCanvasElement>(selector);
    if (!canvas) throw new Error('Missing chart canvas: ' + selector);
    return canvas;
}

async function readHistory(): Promise<HistoryStore> {
    const { history: storedHistory } = await chrome.storage.local.get('history');
    return isHistoryStore(storedHistory) ? storedHistory : {};
}

async function saveCurrentConfig(): Promise<void> {
    await saveConfig(config);
}

function setupChart(ctx: ChartItem, range: number): InstanceType<typeof Chart> {
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

    function getLabels(range: number): string[] {
        const keys = Object.keys(history);
        const output: string[] = [];
        for (let index = 0; index < keys.length; index++) {
            output.push(keys[index].replace('d', '').replace('/', '-'));
            if (range && index + 1 === range) break;
        }
        return output.reverse();
    }

    function getValues(range: number): StatSeries {
        const grouped = groupByDay(history);
        const output: StatSeries = { view: [], write: [], reply: [] };
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

    function getMax(numArray: number[]): number {
        if (numArray.length === 0) return 0;
        return Math.max.apply(null, numArray);
    }
    function getSum(): StatTotals {
        const grouped = groupByDay(history);
        const sum: StatTotals = { view: 0, write: 0, reply: 0 };
        for (const value of Object.values(grouped)) {
            sum.view += value.view;
            sum.write += value.write;
            sum.reply += value.reply;
        }
        return sum;
    }

    const total = getSum();
    setText('.view-box-part-detail.view', total.view);
    setText('.view-box-part-detail.write', total.write);
    setText('.view-box-part-detail.reply', total.reply);

    return myChart;
}

function setupDoughnutChart(ctx: ChartItem): InstanceType<typeof Chart> {
    const grouped = groupByGall(history);
    const label: string[] = [];
    const data: StatSeries = { view: [], write: [], reply: [] };
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

function initBlacklist(): void {
    let id = config.blacklist_filter.id;
    let ip = config.blacklist_filter.ip;
    let nickname = config.blacklist_filter.nickname;
    let keyword = config.blacklist_filter.keyword;

    ip = ip == 'a^'? '' : ip.replace(/\|/g,'\r\n');
    id = id == 'a^'? '' : id.replace(/\|/g,'\r\n');
    nickname = nickname == 'a^'? '' : nickname.replace(/\|/g,'\r\n');
    keyword = keyword == 'a^'? '' : keyword.replace(/\|/g,'\r\n');

    setTextareaValue('.editText.blacklist.id', id);
    setTextareaValue('.editText.blacklist.ip', ip);
    setTextareaValue('.editText.blacklist.nickname', nickname);
    setTextareaValue('.editText.blacklist.keyword', keyword);

    TLN.append_line_numbers('tln-blacklist-id');
    TLN.append_line_numbers('tln-blacklist-ip');
    TLN.append_line_numbers('tln-blacklist-nickname');
    TLN.append_line_numbers('tln-blacklist-keyword');

    qsa<HTMLTextAreaElement>('.editText.blacklist').forEach(growTextarea);
    qsa('.smallbox.blacklist:not(.nickname)').forEach((element) => element.style.display = 'none');
}

function initUsermemo(): void {
    const textarea = qs<HTMLTextAreaElement>('textarea.userMemo');
    if (!textarea) return;
    textarea.value = config.userMemo_filter;
    TLN.append_line_numbers('tln-userMemo');
    growTextarea(textarea);
    if (getComputedStyle(textarea).height === '0px') textarea.style.height = '72px';
}

function initBootStrapButton(): void {
    qsa<HTMLInputElement>('.toggler:not(.sub-option)').forEach(function (elem) {
        const key = elem.getAttribute('t');
        if (!isBooleanConfigKey(key)) return;
        const value = config[key];
        elem.checked = Boolean(value);

        if(elem.getAttribute('haveChildren') != null && elem.checked === false) {
            const childBox = elem.closest('.box')?.nextElementSibling;
            if (childBox instanceof HTMLElement) childBox.style.display = 'none';
        }
    });

    qsa('div[class^=menu-container]:not([index="0"])').forEach((element) => element.style.display = 'none');
}

async function addUpdateNotification(innerText: string): Promise<void> {
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

function addFootprint(): void {
    document.body.insertAdjacentHTML('beforeend', '<div id="footPrint">dcsimpler | '+version+'</div>');
}

async function loadUpdatelog(): Promise<void> {
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

function growTextarea(elem: HTMLTextAreaElement | null): void {
    if (!elem) return;
    const offset = elem.offsetHeight - elem.clientHeight;
    const resizeTextarea = function(element: HTMLTextAreaElement): void {
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

function testfield(obj: Record<BlacklistFilterKey, HTMLElement | null>): void {
    const filter = config.blacklist_filter;
    blacklistKeys.forEach(function (elem) {
        const target = obj[elem];
        if (!target) return;
        const frag = document.createDocumentFragment();
        const arr = filter[elem].split('|');
        const info = document.createElement('div');
        info.className = 'data-info';
        info.textContent = String(filter[elem].length);
        const info2 = document.createElement('div');
        info2.className = 'data-info2';
        info2.textContent = String(arr.length);
        frag.append(info, info2);
        arr.forEach(function (cuv: string) {
            const item = document.createElement('div');
            item.className = 'fragments';
            item.textContent = cuv + ' ';
            frag.append(item);
        });
        target.append(frag);
    });
}

function bindOptionHandlers(charts: OptionsCharts): void {
    delegate(document, 'click', '.item', function () {
        const index = this.getAttribute('index');
        if(this.getAttribute('pageMove') != null) {window.open('https://chrome.google.com/webstore/detail/dcsimpler/kgpiejjjpjkcijopeabfleliifbhfnci?hl=ko'); return;}

        qsa('.item').forEach((item) => item.classList.toggle('clicked', item.getAttribute('index') === index));
        qsa('.menu-container').forEach((container) => setDisplay(container, container.getAttribute('index') === index));
    });

    setInputValue('.editText#input-layout-minimize', config.minimizeLayout_filter);
    delegate<HTMLElement>(document, 'click', '.saveText#button-layout-minimize', async function () {
        const element = getPreviousInput(this);
        if (!element) return;
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

    delegate<HTMLInputElement>(document, 'click', 'input.saveText.blac', function () {
        qsa('.saveText.blac').forEach((button) => button.classList.remove('selected'));
        this.classList.add('selected');

        const index = this.getAttribute('index');
        qsa('.smallbox.blacklist').forEach((box) => setDisplay(box, false));
        if (index) qsa('.smallbox.blacklist.'+index).forEach((box) => setDisplay(box, true));
    });
    qs('.saveText.blac.nickname')?.click();

    delegate<HTMLButtonElement>(document, 'click', '.saveText.blacklist', async function () {
        const d = this.classList[2];
        if (!isBlacklistFilterKey(d)) return;
        const textarea = qs('textarea.blacklist.'+d);
        if (!(textarea instanceof HTMLTextAreaElement)) return;
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
            showElementError(element);
            flashOk(element);
        }
        catch (e) {
            flashErr(element);
            return;
        }

        config.blacklist_filter[d] = value;
        await saveCurrentConfig();
    });

    delegate<HTMLTextAreaElement, KeyboardEvent>(document, 'keydown', 'textarea.blacklist', function(event){
        if(event.key === 'Enter' && event.shiftKey){
            qs('.saveText.'+this.classList[1]+'.'+this.classList[2])?.click();
            event.preventDefault();
            event.stopPropagation();
        }
    });

    delegate<HTMLElement>(document, 'click', '.saveText.userMemo.save', async function () {
        const textArea = qs<HTMLTextAreaElement>('.editText.userMemo');
        if (!textArea) return;
        const targets = [qs('.box.child.userMemo'), textArea];
        showElementError(targets);
        flashOk(targets);
        config.userMemo_filter = textArea.value;
        await saveCurrentConfig();
    });

    delegate<HTMLTextAreaElement, KeyboardEvent>(document, 'keydown', 'textarea.userMemo', function(event){
        if(event.key === 'Enter' && event.shiftKey){
            qs('.saveText.userMemo.save')?.click();
            event.preventDefault();
            event.stopPropagation();
        }
    });

    delegate<HTMLElement>(document, 'click', '.saveText.export', function () {
        const textarea = findSectionTextarea(this);
        if (!textarea) return;
        downloadTextFile(exportFilename(textarea), textarea.value);
    });

    delegate<HTMLElement>(document, 'click', '.saveText.import', function () {
        const textarea = findSectionTextarea(this);
        if (!textarea) return;
        importTextFile(function (text) {
            textarea.value = normalizeImportedText(text);
            trigger(textarea, 'input');
            flashOk(textarea);
        });
    });

    document.addEventListener('change', async function (event) {
        if (!(event.target instanceof HTMLInputElement) || !event.target.matches('.toggler')) return;
        const key = event.target.getAttribute('t');
        if (!isBooleanConfigKey(key)) return;
        const value = event.target.checked;

        config[key] = value;
        await saveCurrentConfig();

        if(event.target.getAttribute('haveChildren') != null) {
            const childBox = event.target.closest('.box')?.nextElementSibling;
            if (childBox instanceof HTMLElement) childBox.style.display = value ? '' : 'none';
        }
    });

    delegate<HTMLInputElement, KeyboardEvent>(document, 'keydown', 'input.editText', function (event) {
        if(event.key === 'Enter' && this.nextElementSibling instanceof HTMLElement) this.nextElementSibling.click();
    });

    qs('.upload-image-delegator')?.addEventListener('click', function () { qs('#upload-image')?.click(); });
    qs('.upload-image-deletor')?.addEventListener('click', async function () {
        await chrome.storage.local.set({ autoInsertImageData: {} });
        setText('.image-name', '설정된 이미지 파일이 없습니다');
    });

    qs('#upload-image')?.addEventListener('change', function (event) {
        const input = getFileInput(event);
        const file = input?.files?.[0];
        if (!file) return;
        const MAX_IMAGE_BYTES = 7 * 1024 * 1024;
        if (file.size > MAX_IMAGE_BYTES) {
            alert('이미지 용량이 너무 큽니다. 7MB 이하 파일을 사용해주세요.');
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async function(event: ProgressEvent<FileReader>) {
            const fileReader = getFileReader(event);
            const imageData = fileReader ? getImageDataFromReader(fileReader, file) : null;
            if (!imageData) {
                alert('이미지를 불러오지 못했습니다.');
                return;
            }
            try {
                await chrome.storage.local.set({ autoInsertImageData: imageData });
                setText('.image-name', file.name);
            } catch (e) {
                console.error(e);
                alert('이미지를 저장하지 못했습니다. 파일 용량을 줄여 다시 시도해주세요.');
            }
        };
        reader.readAsDataURL(file);
    });

    const recreateCharts = async function (): Promise<void> {
        history = await readHistory();
        charts.chart.destroy();
        charts.chart = setupChart(getCanvas('#weekly-chart'), 7);
        charts.monthChart.destroy();
        charts.monthChart = setupChart(getCanvas('#monthly-chart'), 30);
        charts.doughnutChart.destroy();
        charts.doughnutChart = setupDoughnutChart(getCanvas('#doughnut-chart'));
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

async function initOptions(): Promise<void> {
    config = await getConfig();
    history = await readHistory();
    version = chrome.runtime.getManifest().version;
    const bg = qs('#bg');
    if (bg) {
        bg.style.opacity = '0';
        bg.style.zIndex = '-999';
    }
    setText('#footer', 'dcsimpler_v.'+version);
    qs('.menu-container[index="5"] p')?.insertAdjacentHTML('afterbegin', '<p>ver.'+version+'</p>');
    await addUpdateNotification(updateDescription);
    initUsermemo();
    initBlacklist();
    initBootStrapButton();
    addFootprint();
    loadUpdatelog();

    const charts = {
        chart: setupChart(getCanvas('#weekly-chart'), 7),
        monthChart: setupChart(getCanvas('#monthly-chart'), 30),
        doughnutChart: setupDoughnutChart(getCanvas('#doughnut-chart'))
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
    setText(
        '.image-name',
        isAutoInsertImageData(autoInsertImageData) && autoInsertImageData.filename
            ? autoInsertImageData.filename
            : '설정된 이미지 파일이 없습니다',
    );

    bindOptionHandlers(charts);
}

document.addEventListener('DOMContentLoaded', function () {
    initOptions().catch(function (e) {
        console.error(e);
    });
});
