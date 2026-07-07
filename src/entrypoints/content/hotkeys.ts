import { pageContext } from './context';
import { isDialogTarget, isEditableTarget } from './dom';
import { keyEnum, normalizeKey } from './state';

function blocksGlobalHotkey(target) {
    return isEditableTarget(target) || isDialogTarget(target);
}

export function bindHotkeys() {
    document.documentElement.addEventListener('keydown', function(event) {
        var key = normalizeKey(event);

        if(key === keyEnum.C && !event.ctrlKey && !isEditableTarget(event.target)) {
            if (pageContext.lists && document.querySelector('#dcs_dialog')) {
                document.querySelector<HTMLIFrameElement>('#dcs_iframe')?.contentWindow?.document.querySelector<HTMLTextAreaElement>('textarea')?.focus();
            }
            else if (pageContext.view) {
                document.querySelector<HTMLElement>('#avoiding_c')?.focus();
                setTimeout(function () { document.querySelector<HTMLTextAreaElement>('body textarea')?.focus(); },10);
            }
        }
        else if(key === keyEnum.W && !event.ctrlKey) {
            if(!blocksGlobalHotkey(event.target)) document.querySelector<HTMLElement>('#btn_write')?.click();
        }
        else if(key === keyEnum.Q && !event.ctrlKey) {
            if(!isEditableTarget(event.target)) document.querySelector<HTMLElement>('#viewToggle')?.click();
        }
        else if(key === keyEnum.R && !event.ctrlKey) {
            if(!blocksGlobalHotkey(event.target)) document.querySelector<HTMLElement>('.btn_normal')?.click();
        }
        else if(key === keyEnum.T && !event.ctrlKey) {
            if(!blocksGlobalHotkey(event.target)) window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        else if(key === keyEnum.A && !event.ctrlKey) {
            if(!blocksGlobalHotkey(event.target)) {
                var current = document.querySelector('.bottom_paging_box em');
                var prev = current?.previousElementSibling as HTMLElement | null || document.querySelector<HTMLElement>('.bottom_paging_box a');
                prev?.click();
            }
        }
        else if(key === keyEnum.S && !event.ctrlKey) {
            if(!blocksGlobalHotkey(event.target)) {
                var current = document.querySelector('.bottom_paging_box em');
                var next = current?.nextElementSibling as HTMLElement | null || Array.from(document.querySelectorAll<HTMLElement>('.bottom_paging_box a')).at(-1);
                next?.click();
            }
        }
    });
}
