declare const chrome: any;

interface Object {
  [key: string]: any;
}

interface ObjectConstructor {
  entries(o: any): [string, any][];
  values(o: any): any[];
}

interface Window {
  Editor: any;
}

interface Element {
  checked: boolean;
  contentDocument: Document | null;
  contentWindow: Window;
  filebyte: string;
  filename: string;
  filetype: string;
  focus(): void;
  innerText: string;
  scrollLeft: number;
  scrollTop: number;
  style: CSSStyleDeclaration;
  value: string;
  click(): void;
}

interface EventTarget {
  checked: boolean;
  closest(selector: string): Element | null;
  getAttribute(qualifiedName: string): string | null;
  id: string;
  matches(selectors: string): boolean;
}

interface Node {
  classList: DOMTokenList;
  style: CSSStyleDeclaration;
}

interface ParentNode {
  scrollLeft: number;
  scrollTop: number;
}

interface ErrorConstructor {
  new (message?: any): Error;
  (message?: any): Error;
}
