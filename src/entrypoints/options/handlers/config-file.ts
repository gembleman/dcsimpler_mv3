import type { AppConfig } from '@/lib/default-config';
import { delegate } from '@/lib/dom';
import { normalizeConfig } from '@/lib/storage';
import { downloadTextFile, importTextFile } from '../text-files';
import { flashOk } from '../dom-effects';
import { copyConfig, parseImportedConfig, syncConfigControls } from './shared';

export function bindConfigFileHandlers(config: AppConfig, saveCurrentConfig: () => Promise<void>): void {
    delegate<HTMLButtonElement>(document, 'click', '.saveText.config-export', function () {
        downloadTextFile('dcsimpler-config.json', JSON.stringify(normalizeConfig(config), null, 2), 'application/json;charset=utf-8');
    });

    delegate<HTMLButtonElement>(document, 'click', '.saveText.config-import', function () {
        const button = this;
        importTextFile(async function (text) {
            const importedConfig = parseImportedConfig(text);
            if (!importedConfig) {
                alert('설정 JSON 파일을 읽지 못했습니다.');
                return;
            }

            copyConfig(config, importedConfig);
            syncConfigControls(config);
            await saveCurrentConfig();
            flashOk(button);
        }, '.json,application/json');
    });
}
