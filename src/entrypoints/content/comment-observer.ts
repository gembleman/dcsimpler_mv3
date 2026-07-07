function mutationAddedComment(mutation: MutationRecord): boolean {
    const target = mutation.target;
    return mutation.addedNodes.length > 0
        && target instanceof Element
        && target.classList[0] === 'comment_wrap';
}

export function observeCommentMutations(
    root: Node,
    onCommentAdded: () => void,
    onMutations?: (mutations: MutationRecord[]) => void,
): MutationObserver {
    const observer = new MutationObserver(function (mutations) {
        if (mutations.some(mutationAddedComment)) onCommentAdded();
        onMutations?.(mutations);
    });
    observer.observe(root, { subtree: true, childList: true, attributeOldValue: true, attributes: true });
    return observer;
}
