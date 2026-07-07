export function fetching (url, controller){
    const response = fetch(url, {
        signal: controller.signal,
        credentials: 'include'
    });
    return response.then(res => res);
}

export function exitMain () {
    console.warn('DCSimpler: 초기화를 중단합니다.');
}

export function insertAfter(newNode, existingNode) {
    existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
}

export function strToNode(str) {
    return document.createRange().createContextualFragment(str);
}
