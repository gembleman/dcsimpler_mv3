import { pageContext } from './context';
import { isDialogTarget, isEditableTarget } from './dom';
import { keyEnum, normalizeKey } from './state';

function blocksGlobalHotkey(target: EventTarget | null) {
    return isEditableTarget(target) || isDialogTarget(target);
}

function focusCommentEditor() {
    if (pageContext.lists && document.querySelector('#dcs_dialog')) {
        document.querySelector<HTMLIFrameElement>('#dcs_iframe')?.contentWindow?.document.querySelector<HTMLTextAreaElement>('textarea')?.focus();
    }
    else if (pageContext.view) {
        document.querySelector<HTMLElement>('#avoiding_c')?.focus();
        setTimeout(function () { document.querySelector<HTMLTextAreaElement>('body textarea')?.focus(); },10);
    }
}

function clickPreviousPage() {
    const current = document.querySelector('.bottom_paging_box em');
    const prev = current?.previousElementSibling as HTMLElement | null || document.querySelector<HTMLElement>('.bottom_paging_box a');
    prev?.click();
}

function clickNextPage() {
    const current = document.querySelector('.bottom_paging_box em');
    const next = current?.nextElementSibling as HTMLElement | null || Array.from(document.querySelectorAll<HTMLElement>('.bottom_paging_box a')).at(-1);
    next?.click();
}

type HotkeyAction = (event: KeyboardEvent) => void;

const hotkeyActions: Record<string, HotkeyAction> = {
    [keyEnum.C]: function (event) {
        if (!isEditableTarget(event.target)) focusCommentEditor();
    },
    [keyEnum.W]: function (event) {
        if (!blocksGlobalHotkey(event.target)) document.querySelector<HTMLElement>('#btn_write')?.click();
    },
    [keyEnum.Q]: function (event) {
        if (!isEditableTarget(event.target)) document.querySelector<HTMLElement>('#viewToggle')?.click();
    },
    [keyEnum.R]: function (event) {
        if (!blocksGlobalHotkey(event.target)) document.querySelector<HTMLElement>('.btn_normal')?.click();
    },
    [keyEnum.T]: function (event) {
        if (!blocksGlobalHotkey(event.target)) window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [keyEnum.A]: function (event) {
        if (!blocksGlobalHotkey(event.target)) clickPreviousPage();
    },
    [keyEnum.S]: function (event) {
        if (!blocksGlobalHotkey(event.target)) clickNextPage();
    },
};

export function bindHotkeys() {
    document.documentElement.addEventListener('keydown', function(event) {
        if (event.ctrlKey) return;
        hotkeyActions[normalizeKey(event)]?.(event);
    });
}
