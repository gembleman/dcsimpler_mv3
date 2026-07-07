import { pageContext } from './context';
import type {
    ConfigRequestMessage,
    ConfigResponseMessage,
    StatRequestMessage,
} from '../../lib/messages';
import type { StatFlag } from '../../lib/stats';

export interface ContentApp {
    requestConfig(): Promise<ConfigResponseMessage>;
    sendToBackground(msg: StatFlag): void;
}

export const app: ContentApp = {
    requestConfig() {
        return new Promise<ConfigResponseMessage>(function (resolve, reject) {
            const message: ConfigRequestMessage = { flag: 'request' };
            chrome.runtime.sendMessage(message, function(response: ConfigResponseMessage | undefined) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                if(response) resolve(response);
                else reject(new Error('Config response is empty'));
            });
        })
    },
    sendToBackground(msg: StatFlag) {
        const message: StatRequestMessage = { flag: msg, id: pageContext.query.id, name: document.title };
        chrome.runtime.sendMessage(message, function() {
            if (chrome.runtime.lastError) return;
        });
    },
};
