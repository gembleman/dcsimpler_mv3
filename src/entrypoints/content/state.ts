export let config: any;
export const filter: any = {
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
export function setConfig(nextConfig) {
    config = nextConfig;
}


export function normalizeKey(event) {
    return event.key.length === 1 ? event.key.toLowerCase() : event.key;
}
