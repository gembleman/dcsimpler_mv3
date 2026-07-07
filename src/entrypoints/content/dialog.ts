import { delegate } from './dom';
import { postprocessing } from './postprocess';

type OpenDialogOptions = {
    onClose?: () => void;
};

let activeDialog: HTMLDialogElement | null = null;

export function closeDialog() {
    if (activeDialog?.open) activeDialog.close();
}

export function openDialog(
    position: Element | null,
    callback?: (error: unknown, body: HTMLElement) => void,
    options: OpenDialogOptions = {},
) {
    const beforeUrl = location.href;
    document.querySelector('body > #dcs_dialog')?.remove();
    const dialog = document.createElement('dialog');
    dialog.id = 'dcs_dialog';
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'dcs-dialog-close';
    closeButton.setAttribute('aria-label', 'close');
    const dialogBody = document.createElement('div');
    dialogBody.id = 'dcs_dialog_body';
    dialog.replaceChildren(closeButton, dialogBody);
    document.body.prepend(dialog);
    const body = dialogBody;
    activeDialog = dialog;

    positionDialog(dialog, position);
    dialog.style.background = postprocessing.dialogBackgroundColor;
    body.style.background = postprocessing.dialogBackgroundColor;
    const spinner = document.createElement('div');
    spinner.className = 'spinner_wrap';
    body.append(spinner);

    closeButton.addEventListener('click', closeDialog);
    dialog.addEventListener('click', function (event) {
        if (clickedBackdrop(event, dialog)) closeDialog();
    });
    dialog.addEventListener('close', function () {
        history.replaceState({ prev: 'replace' }, 'title', beforeUrl);
        document.documentElement.style.overflow = 'auto';
        dialog.remove();
        options.onClose?.();
        if (activeDialog === dialog) activeDialog = null;
    });
    document.documentElement.style.overflow = 'hidden';
    dialog.showModal();
    dialog.focus();

    delegate(body, 'click', '.gall_comment', function () {
        const iframe = document.getElementById('dcs_iframe') as HTMLIFrameElement | null;
        const focusCmt = iframe?.contentWindow?.document.querySelector('#focus_cmt');
        if (focusCmt) focusCmt.scrollIntoView();
    });

    typeof callback == 'function' ? callback(undefined, body) : null;
    return body;
}

function positionDialog(dialog: HTMLDialogElement, anchor: Element | null) {
    const rect = anchor?.getBoundingClientRect();
    const width = Math.min(880, window.innerWidth - 24);
    const left = rect ? Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)) : Math.max(12, (window.innerWidth - width) / 2);
    const top = rect ? Math.max(12, Math.min(rect.bottom, window.innerHeight - 80)) : 48;
    dialog.style.width = width + 'px';
    dialog.style.left = left + 'px';
    dialog.style.top = top + 'px';
}

function clickedBackdrop(event: MouseEvent, dialog: HTMLDialogElement) {
    if (event.target !== dialog) return false;
    const rect = dialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
}
