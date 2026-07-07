import type { Browser } from '@wxt-dev/browser';

declare global {
  const chrome: typeof Browser;

  interface DcInsideEditorAttacher {
    attachHandler(data: unknown): void;
  }

  interface DcInsideEditorSidebar {
    getAttacher(type: 'image', hostWindow: Window): DcInsideEditorAttacher | undefined;
  }

  interface DcInsideEditor {
    getSidebar(): DcInsideEditorSidebar | undefined;
  }

  interface Window {
    Editor?: DcInsideEditor;
  }
}

export {};
