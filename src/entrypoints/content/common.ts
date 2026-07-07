interface FetchControllerLike {
    signal: AbortSignal | null;
}

export function fetching(url: string, controller: FetchControllerLike): Promise<Response> {
    const response = fetch(url, {
        signal: controller.signal,
        credentials: 'include'
    });
    return response.then(res => res);
}

export function exitMain () {
    console.warn('DCSimpler: 초기화를 중단합니다.');
}

export function insertAfter(newNode: Node, existingNode: Node) {
    existingNode.parentNode?.insertBefore(newNode, existingNode.nextSibling);
}

export function strToNode(str: string): DocumentFragment {
    return document.createRange().createContextualFragment(str);
}
