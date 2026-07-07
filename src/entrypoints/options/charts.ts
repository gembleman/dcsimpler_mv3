import Chart from 'chart.js/auto';
import type { ChartItem } from 'chart.js';
import { groupByDay, groupByGall, normalizeHistoryStore, type HistoryStore } from '@/lib/stats';
import { qs } from '@/lib/dom';
import { setText } from './dom-effects';
import type { OptionsCharts } from './types';

type StatSeries = Record<'view' | 'write' | 'reply', number[]>;
type StatTotals = Record<'view' | 'write' | 'reply', number>;

export function getCanvas(selector: string): HTMLCanvasElement {
    const canvas = qs<HTMLCanvasElement>(selector);
    if (!canvas) throw new Error('Missing chart canvas: ' + selector);
    return canvas;
}

export async function readHistory(): Promise<HistoryStore> {
    const { history: storedHistory } = await chrome.storage.local.get('history');
    return normalizeHistoryStore(storedHistory);
}

function getChartLabels(history: HistoryStore, range: number): string[] {
    const keys = Object.keys(history);
    const output: string[] = [];
    for (let index = 0; index < keys.length; index++) {
        output.push(keys[index].replace('d', '').replace('/', '-'));
        if (range && index + 1 === range) break;
    }
    return output.reverse();
}

function getStatSeries(history: HistoryStore, range: number): StatSeries {
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

function getStatTotals(history: HistoryStore): StatTotals {
    const grouped = groupByDay(history);
    const sum: StatTotals = { view: 0, write: 0, reply: 0 };
    for (const value of Object.values(grouped)) {
        sum.view += value.view;
        sum.write += value.write;
        sum.reply += value.reply;
    }
    return sum;
}

function createLineDatasets(data: StatSeries) {
    const transparent = '#ffffff00';
    const pointBackgroundColor = 'white';
    return [
        {
            label: '게시물 조회',
            data: data.view,
            yAxisID: 'y-a1',
            backgroundColor: transparent,
            borderColor: '#337ab7',
            tension: 0,
            type: 'line' as const,
            borderWidth: 3,
            pointRadius: 3,
            pointBorderWidth: 2,
            pointBackgroundColor,
        },
        {
            label: '글 작성',
            data: data.write,
            yAxisID: 'y-a2',
            backgroundColor: transparent,
            borderColor: '#f3bc206b',
            tension: 0,
            borderWidth: 3,
            pointRadius: 0,
            pointBorderWidth: 2,
            pointBackgroundColor,
        },
        {
            label: '댓글 작성',
            data: data.reply,
            yAxisID: 'y-a2',
            backgroundColor: transparent,
            borderColor: '#2eb6238c',
            tension: 0,
            borderWidth: 3,
            pointRadius: 0,
            pointBorderWidth: 2,
            pointBackgroundColor,
        },
    ];
}

function buildLineChartData(history: HistoryStore, range: number) {
    const data = getStatSeries(history, range);
    return {
        labels: getChartLabels(history, range),
        datasets: createLineDatasets(data),
        series: data,
    };
}

function buildDoughnutChartData(history: HistoryStore) {
    const grouped = groupByGall(history);
    const labels: string[] = [];
    const series: StatSeries = { view: [], write: [], reply: [] };
    for (const value of Object.values(grouped)) {
        labels.push(value.name);
        series.view.push(value.view);
        series.write.push(value.write);
        series.reply.push(value.reply);
    }
    return { labels, series };
}

function updateStatTotals(history: HistoryStore): void {
    const total = getStatTotals(history);
    setText('.view-box-part-detail.view', total.view);
    setText('.view-box-part-detail.write', total.write);
    setText('.view-box-part-detail.reply', total.reply);
}

function setupChart(ctx: ChartItem, range: number, history: HistoryStore): InstanceType<typeof Chart> {
    const chartData = buildLineChartData(history, range);

    Chart.defaults.font.family = 'Noto Sans KR';
    Chart.defaults.font.weight = 'bold';
    const myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: chartData.datasets,
        },
        options: {
            plugins: {
                legend: { display: false, labels: { color: 'rgb(255, 99, 132)' } },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                x: { grid: { display: false } },
                'y-a1': { type:'linear', position: 'left', beginAtZero: true, suggestedMax:getMax(chartData.series.view)+530 },
                'y-a2': { type:'linear', position:'right', beginAtZero: true, suggestedMax:getMax(chartData.series.write)+130, grid: { drawOnChartArea: false } }
            }
        }
    });

    updateStatTotals(history);
    return myChart;
}

function setupDoughnutChart(ctx: ChartItem, history: HistoryStore): InstanceType<typeof Chart> {
    const data = buildDoughnutChartData(history);

    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [
                { label: 'My First Dataset', data: data.series.view, backgroundColor: ['#ff6384', '#ff9f43', '#ffcd59', '#4bc0c0', '#38a2ea', '#9a68fe', '#c9cbcf'] },
                { label: 'My First Dataset', data: data.series.write, backgroundColor: ['#ff6384', '#ff9f43', '#ffcd59', '#4bc0c0', '#38a2ea', '#9a68fe', '#c9cbcf'] },
                { label: 'My First Dataset', data: data.series.reply, backgroundColor: ['#ff6384', '#ff9f43', '#ffcd59', '#4bc0c0', '#38a2ea', '#9a68fe', '#c9cbcf'] }
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

export function createOptionsCharts(history: HistoryStore): OptionsCharts {
    return {
        chart: setupChart(getCanvas('#weekly-chart'), 7, history),
        monthChart: setupChart(getCanvas('#monthly-chart'), 30, history),
        doughnutChart: setupDoughnutChart(getCanvas('#doughnut-chart'), history)
    };
}

export async function recreateCharts(charts: OptionsCharts): Promise<HistoryStore> {
    const history = await readHistory();
    charts.chart.destroy();
    charts.chart = setupChart(getCanvas('#weekly-chart'), 7, history);
    charts.monthChart.destroy();
    charts.monthChart = setupChart(getCanvas('#monthly-chart'), 30, history);
    charts.doughnutChart.destroy();
    charts.doughnutChart = setupDoughnutChart(getCanvas('#doughnut-chart'), history);
    return history;
}
