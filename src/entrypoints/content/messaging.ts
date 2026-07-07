import { pageContext } from './context';

export let app: any = {};

app.requestConfig = function () {
    return new Promise ( function (resolve, reject) {
        chrome.runtime.sendMessage({flag: 'request'}, function(response) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
                return;
            }
            if(response) resolve(response);
            else reject(new Error('Config response is empty'));
        });
    })
}

app.sendToBackground = function (msg) {
    chrome.runtime.sendMessage({flag: msg, id: pageContext.query.id, name: document.title}, function(response) {
        if (chrome.runtime.lastError) return;
    });
}
