export { delegate, qs, qsa, type QueryRoot } from '@/lib/dom';

export function parseHtml(text: string): Document {
    return new DOMParser().parseFromString(text, 'text/html');
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
