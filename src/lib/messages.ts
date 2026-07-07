import type { AppConfig } from './default-config';
import type { StatFlag, StatRequest } from './stats';

export const STAT_FLAGS = ['view', 'write', 'reply'] as const satisfies readonly StatFlag[];

export type ConfigRequestMessage = {
  flag: 'request';
};

export type OpenConfigMessage = {
  flag: 'openConfig';
};

export type StatRequestMessage = StatRequest;

export type BackgroundRequestMessage =
  | ConfigRequestMessage
  | OpenConfigMessage
  | StatRequestMessage;

export type CommandWriteMessage = {
  flag: 'command:write';
};

export type ContentRequestMessage = CommandWriteMessage;

export type ConfigResponseMessage = AppConfig;

export type StatResponseMessage = {
  baz: 'success' | 'fail';
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isStatFlag(value: unknown): value is StatFlag {
  return typeof value === 'string' && (STAT_FLAGS as readonly string[]).includes(value);
}

export function isConfigRequestMessage(value: unknown): value is ConfigRequestMessage {
  return isObjectRecord(value) && value.flag === 'request';
}

export function isOpenConfigMessage(value: unknown): value is OpenConfigMessage {
  return isObjectRecord(value) && value.flag === 'openConfig';
}

export function isStatRequestMessage(value: unknown): value is StatRequestMessage {
  if (!isObjectRecord(value) || !isStatFlag(value.flag)) return false;
  return (
    (value.id === undefined || typeof value.id === 'string') &&
    (value.name === undefined || typeof value.name === 'string')
  );
}

export function isCommandWriteMessage(value: unknown): value is CommandWriteMessage {
  return isObjectRecord(value) && value.flag === 'command:write';
}
