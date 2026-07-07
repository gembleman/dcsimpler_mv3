import { delegate, qsa } from '@/lib/dom';
import { setDisplay } from '../dom-effects';

export function bindMenuHandlers(): void {
    delegate(document, 'click', '.item', function () {
        const index = this.getAttribute('index');
        qsa('.item').forEach((item) => item.classList.toggle('clicked', item.getAttribute('index') === index));
        qsa('.menu-container').forEach((container) => setDisplay(container, container.getAttribute('index') === index));
    });
}
