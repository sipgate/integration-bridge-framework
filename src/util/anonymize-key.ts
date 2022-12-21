const ANONYMIZED_KEY_LENGTH: number = 10;

export function anonymizeKey(key: string): string {
  return `...${key.slice(key.length - ANONYMIZED_KEY_LENGTH)}`;
}
