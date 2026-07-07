import type { AppConfig, BlacklistFilterKey } from '../../lib/default-config';

export type CompiledBlacklistFilter = Record<BlacklistFilterKey, RegExp>;
export interface UserMemoFilter {
    ip: string[];
    tag: string[];
}

export let config: AppConfig;
export const filter: {
    blacklist: Partial<CompiledBlacklistFilter>;
    usermemo: UserMemoFilter;
} = {
    blacklist: {},
    usermemo: { ip: [], tag: [] }
};
export const keyEnum = {
    C: 'c',
    Q: 'q',
    R: 'r',
    A: 'a',
    S: 's',
    W: 'w',
    T: 't',
    ESC: 'Escape',
    TAB: 'Tab'
};
export function setConfig(nextConfig: AppConfig) {
    config = nextConfig;
}


export function normalizeKey(event: KeyboardEvent): string {
    return event.key.length === 1 ? event.key.toLowerCase() : event.key;
}
