export function qs(selector, root = document) {
    return root.querySelector(selector);
}

export function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
}

export function parseHtml(text) {
    return new DOMParser().parseFromString(text, 'text/html');
}

export function delegate(root, eventName, selector, handler) {
    root.addEventListener(eventName, function (event) {
        if (!(event.target instanceof Element)) return;
        const target = event.target.closest(selector);
        if (!target) return;
        if (root !== document && !root.contains(target)) return;
        handler.call(target, event, target);
    });
}

export function trigger(element, eventName) {
    if (!element) return;
    element.dispatchEvent(new MouseEvent(eventName, { bubbles: true, cancelable: true, view: window }));
}

export function setElementVisibility(element, visible, effect) {
    if (!element) return;
    if (effect === 'fade' && typeof element.animate === 'function') {
        if (visible) element.style.display = '';
        const animation = element.animate(
            [{ opacity: visible ? 0 : 1 }, { opacity: visible ? 1 : 0 }],
            { duration: 150, easing: 'ease-out' },
        );
        animation.finished.finally(function () {
            element.style.display = visible ? '' : 'none';
            element.style.opacity = '';
        });
        return;
    }
    element.style.display = visible ? '' : 'none';
}

export function isEditableTarget(target) {
    return target instanceof Element && target.matches('input, textarea');
}

export function isDialogTarget(target) {
    return target instanceof Element && target.matches('#dcs_dialog, #dcs_dialog *');
}
