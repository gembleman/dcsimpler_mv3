import type Chart from 'chart.js/auto';

export interface AutoInsertImageData {
    filebyte?: string;
    filetype?: string;
    filename?: string;
}

export type OptionsCharts = {
    chart: InstanceType<typeof Chart>;
    monthChart: InstanceType<typeof Chart>;
    doughnutChart: InstanceType<typeof Chart>;
};
