import { qs, qsa } from '@/lib/dom';

export type ElementTarget =
    | string
    | Element
    | ArrayLike<Element | null | undefined>
    | Iterable<Element | null | undefined>
    | null
    | undefined;

export function toElements(target: ElementTarget): HTMLElement[] {
    if (target == null) return [];
    if (typeof target === 'string') return qsa(target);
    if (target instanceof HTMLElement) return [target];
    if (target instanceof Element) return [];
    if (target instanceof NodeList || target instanceof HTMLCollection || Array.isArray(target)) {
        return Array.from(target).filter((element): element is HTMLElement => element instanceof HTMLElement);
    }
    return Array.from(target).filter((element): element is HTMLElement => element instanceof HTMLElement);
}

export function getFileInput(event: Event): HTMLInputElement | null {
    return event.target instanceof HTMLInputElement ? event.target : null;
}

export function getFileReader(event: ProgressEvent<FileReader>): FileReader | null {
    return event.target instanceof FileReader ? event.target : null;
}

export function getPreviousInput(element: Element): HTMLInputElement | null {
    return element.previousElementSibling instanceof HTMLInputElement ? element.previousElementSibling : null;
}

export function setText(selector: string, value: string | number): void {
    const element = qs(selector);
    if (element) element.textContent = String(value);
}

export function setTextareaValue(selector: string, value: string): void {
    const textarea = qs<HTMLTextAreaElement>(selector);
    if (textarea) textarea.value = value;
}

export function setInputValue(selector: string, value: string): void {
    const input = qs<HTMLInputElement>(selector);
    if (input) input.value = value;
}

export function trigger(element: EventTarget | null | undefined, eventName: string): void {
    if (!element) return;
    element.dispatchEvent(new Event(eventName, { bubbles: true, cancelable: true }));
}

export function setDisplay(target: ElementTarget, visible: boolean): void {
    for (const el of toElements(target)) el.style.display = visible ? '' : 'none';
}

function applyFlash(target: ElementTarget, classNames: string[], duration = 1000): void {
    for (const el of toElements(target)) {
        el.style.setProperty('--dcs-flash-bg', getComputedStyle(el).backgroundColor);
        el.classList.remove('dcs-flash-ok', 'dcs-flash-err', 'dcs-shake');
        void el.offsetWidth;
        el.classList.add(...classNames);
        window.setTimeout(function () {
            el.classList.remove(...classNames);
        }, duration);
    }
}

export function flashOk(target: ElementTarget): void {
    applyFlash(target, ['dcs-flash-ok']);
}

export function flashErr(target: ElementTarget): void {
    applyFlash(target, ['dcs-flash-err', 'dcs-shake']);
}

export function showElementError(target: ElementTarget): void {
    for (const el of toElements(target)) el.style.color = 'inherit';
}
