import Anthropic from '@anthropic-ai/sdk';

/** The Claude model every AI feature uses (one place to change it). */
export const AI_MODEL = 'claude-haiku-4-5-20251001';

/** Message shown when an AI endpoint is called without a configured key. */
export const AI_NOT_CONFIGURED =
  'AI service not configured. Please add your Anthropic API key in admin settings.';

const KEY_PATTERN = /^sk-ant-[A-Za-z0-9\-_]{10,}$/;

/** Does the string look like an Anthropic API key? */
export function isAnthropicKey(key: string | undefined | null): boolean {
  return !!key && KEY_PATTERN.test(key);
}

/** True when a usable ANTHROPIC_API_KEY is set. */
export function isAiConfigured(): boolean {
  return isAnthropicKey(process.env.ANTHROPIC_API_KEY);
}

/**
 * A client for the current key, or null when AI is not configured. Read on every
 * call so a key set/removed from the admin page takes effect without a restart.
 */
export function getAnthropicClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  return isAnthropicKey(key) ? new Anthropic({ apiKey: key }) : null;
}

/**
 * Set (or clear with '') the key used by this process. Persistence across restarts
 * is handled by AiKeyService (encrypted in the app_settings table).
 */
export function setAnthropicKey(key: string): void {
  process.env.ANTHROPIC_API_KEY = key;
}
