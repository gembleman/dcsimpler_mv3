import { delegate } from '@/lib/dom';
import { clearHistory } from '@/lib/stats';
import { recreateCharts } from '../charts';
import type { OptionsCharts } from '../types';

export function bindStatsHandlers(charts: OptionsCharts): void {
    const refreshCharts = async function () {
        await recreateCharts(charts);
    };

    delegate(document, 'click', '#so-clear', async function () {
        const confirmWindow = confirm('기록을 삭제하시겠습니까?');
        if (confirmWindow) {
            await clearHistory(30);
            await refreshCharts();
        }
    });

    delegate(document, 'click', '#so-refresh', refreshCharts);
}
