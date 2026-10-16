/** A loosely-typed JSON object produced by the model. */
export type AiJson = Record<string, unknown>;

interface MessageLike {
  content: ReadonlyArray<{ type: string; text?: string }>;
}

/** Text of the first text block of an Anthropic message ('' if none). */
export function messageText(msg: MessageLike): string {
  const block = msg.content.find((b) => b.type === 'text');
  return typeof block?.text === 'string' ? block.text : '';
}

/**
 * Parse the first `{ … }` JSON object out of a model reply (tolerates prose and
 * code fences). Throws when there is no usable object, or a required key is missing.
 */
export function parseJsonObject<T extends object = AiJson>(
  raw: unknown,
  requiredKey?: string,
): T {
  const match = typeof raw === 'string' ? raw.match(/\{[\s\S]*\}/) : null;
  if (!match) throw new Error('No JSON object in AI response');
  const data: unknown = JSON.parse(match[0]);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('AI response is not a JSON object');
  }
  if (requiredKey && (data as AiJson)[requiredKey] === undefined) {
    throw new Error(`AI response is missing "${requiredKey}"`);
  }
  return data as T;
}
