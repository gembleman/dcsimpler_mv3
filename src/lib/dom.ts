export type QueryRoot = Document | DocumentFragment | Element;

export function qs<T extends Element = HTMLElement>(selector: string, root: QueryRoot = document): T | null {
  return root.querySelector<T>(selector);
}

export function qsa<T extends Element = HTMLElement>(selector: string, root: QueryRoot = document): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

export function delegate<T extends Element = HTMLElement, E extends Event = Event>(
  root: QueryRoot,
  eventName: string,
  selector: string,
  handler: (this: T, event: E, target: T) => void,
): void {
  root.addEventListener(eventName, function (event) {
    if (!(event.target instanceof Element)) return;
    const target = event.target.closest(selector);
    if (!target || (root !== document && !root.contains(target))) return;
    handler.call(target as T, event as E, target as T);
  });
}
