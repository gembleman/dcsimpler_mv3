import '@fontsource/noto-sans-kr/korean-100.css';
import '@fontsource/noto-sans-kr/korean-300.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './style.css';
import { getConfig, getVisitedGalleries, saveConfig } from '@/lib/storage';
import type { AppConfig } from '@/lib/default-config';
import { qs } from '@/lib/dom';
import { createOptionsCharts, readHistory } from './charts';
import { setText } from './dom-effects';
import { bindOptionHandlers } from './handlers';
import { isAutoInsertImageData } from './image-data';
import {
    addConfigFileControls,
    addUpdateNotification,
    initBlacklist,
    initBootStrapButton,
    initUsermemo,
    loadUpdatelog,
    testfield,
} from './sections';

const updateDescription = '업데이트되었습니다 변경사항을 확인해주세요';

let config: AppConfig;
let version = '';

async function saveCurrentConfig(): Promise<void> {
    await saveConfig(config);
}

async function initOptions(): Promise<void> {
    config = await getConfig();
    const history = await readHistory();
    const visitedGalleries = await getVisitedGalleries();
    version = chrome.runtime.getManifest().version;

    const bg = qs('#bg');
    if (bg) {
        bg.style.opacity = '0';
        bg.style.zIndex = '-999';
    }

    setText('#footer', 'dcsimpler_v.'+version);
    const versionInfo = document.createElement('p');
    versionInfo.textContent = 'ver.' + version;
    qs('.menu-container[index="5"] p')?.prepend(versionInfo);
    await addUpdateNotification(version, updateDescription);
    initUsermemo(config);
    initBlacklist(config);
    initBootStrapButton(config);
    addConfigFileControls();
    loadUpdatelog();

    const charts = createOptionsCharts(history);

    testfield(config, {
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

    bindOptionHandlers({
        config,
        charts,
        visitedGalleries,
        saveCurrentConfig,
    });
}

document.addEventListener('DOMContentLoaded', function () {
    initOptions().catch(function (e) {
        console.error(e);
    });
});
