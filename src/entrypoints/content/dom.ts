type QueryRoot = Document | DocumentFragment | Element;

export function qs<T extends Element = Element>(selector: string, root: QueryRoot = document): T | null {
    return root.querySelector(selector);
}

export function qsa<T extends Element = Element>(selector: string, root: QueryRoot = document): T[] {
    return Array.from(root.querySelectorAll<T>(selector));
}

export function parseHtml(text: string): Document {
    return new DOMParser().parseFromString(text, 'text/html');
}

export function delegate<T extends Element = Element>(
    root: QueryRoot,
    eventName: string,
    selector: string,
    handler: (this: T, event: Event, target: T) => void,
) {
    root.addEventListener(eventName, function (event) {
        if (!(event.target instanceof Element)) return;
        const target = event.target.closest(selector);
        if (!target) return;
        if (root !== document && !root.contains(target)) return;
        handler.call(target as T, event, target as T);
    });
}

export function trigger(element: EventTarget | null | undefined, eventName: string) {
    if (!element) return;
    element.dispatchEvent(new MouseEvent(eventName, { bubbles: true, cancelable: true, view: window }));
}

export function setElementVisibility(element: HTMLElement | null | undefined, visible: boolean, effect?: string) {
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

export function isEditableTarget(target: EventTarget | null): boolean {
    return target instanceof Element && target.matches('input, textarea');
}

export function isDialogTarget(target: EventTarget | null): boolean {
    return target instanceof Element && target.matches('#dcs_dialog, #dcs_dialog *');
}
