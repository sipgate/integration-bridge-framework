const ANONYMIZED_KEY_LENGTH: number = 10;

export function anonymizeKey(key: unknown): string {
  if (!key || typeof key !== 'string') {
    return 'UNKNOWN';
  }

  return `***${key.slice(key.length - ANONYMIZED_KEY_LENGTH)}`;
}
