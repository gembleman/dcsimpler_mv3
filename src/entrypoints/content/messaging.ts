import { pageContext } from './context';
import type { AppConfig } from '../../lib/default-config';

export interface ContentApp {
    requestConfig(): Promise<AppConfig>;
    sendToBackground(msg: string): void;
}

export const app: ContentApp = {
    requestConfig() {
    return new Promise<AppConfig>(function (resolve, reject) {
        chrome.runtime.sendMessage({flag: 'request'}, function(response) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
                return;
            }
            if(response) resolve(response);
            else reject(new Error('Config response is empty'));
        });
    })
},
    sendToBackground(msg: string) {
    chrome.runtime.sendMessage({flag: msg, id: pageContext.query.id, name: document.title}, function() {
        if (chrome.runtime.lastError) return;
    });
},
};
