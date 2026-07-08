import type { AppConfig, BlacklistFilterKey } from '@/lib/default-config';

export const blacklistKeys = ['id', 'ip', 'nickname', 'keyword'] as const satisfies readonly BlacklistFilterKey[];

export const booleanConfigKeys = [
    'autoRefreshImage',
    'blacklist',
    'blacklist_view',
    'blacklist_notice',
    'blurImage',
    'directView',
    'minimizeLayout',
    'addRightSideVisitHistory',
    'upScale',
    'userMemo',
    'autoInsertImage',
    'alignLeftContentWriter',
    'showOuterButtons',
] as const satisfies readonly (keyof AppConfig)[];

export type BooleanConfigKey = typeof booleanConfigKeys[number];

export function isBlacklistFilterKey(value: string | undefined): value is BlacklistFilterKey {
    return value !== undefined && blacklistKeys.includes(value as BlacklistFilterKey);
}

export function isBooleanConfigKey(value: string | null): value is BooleanConfigKey {
    return value !== null && booleanConfigKeys.includes(value as BooleanConfigKey);
}
