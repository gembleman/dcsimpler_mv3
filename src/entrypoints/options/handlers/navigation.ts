import { delegate, qsa } from '@/lib/dom';
import { setDisplay } from '../dom-effects';

const STORE_URL = 'https://chrome.google.com/webstore/detail/dcsimpler/kgpiejjjpjkcijopeabfleliifbhfnci?hl=ko';

export function bindMenuHandlers(): void {
    delegate(document, 'click', '.item', function () {
        const index = this.getAttribute('index');
        if(this.getAttribute('pageMove') != null) {
            window.open(STORE_URL);
            return;
        }

        qsa('.item').forEach((item) => item.classList.toggle('clicked', item.getAttribute('index') === index));
        qsa('.menu-container').forEach((container) => setDisplay(container, container.getAttribute('index') === index));
    });
}
