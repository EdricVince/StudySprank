/** Which AI-backed routes have their result stored in `ai_generations`, and under which kind. */
export interface AiLogRule {
  method: string;
  /** Express route path exactly as registered, e.g. `/api/v1/ai/lesson`. */
  path: string;
  kind: string;
}

export const AI_LOG_RULES: AiLogRule[] = [
  // Teacher content generation
  { method: 'POST', path: '/api/v1/ai/lesson', kind: 'lesson' },
  { method: 'POST', path: '/api/v1/ai/vocab-set', kind: 'vocab_set' },
  { method: 'POST', path: '/api/v1/ai/test', kind: 'test' },
  { method: 'POST', path: '/api/v1/ai/import/scan', kind: 'content_scan' },
  // Student learning helpers
  { method: 'POST', path: '/api/v1/ai/vocabulary', kind: 'vocabulary' },
  {
    method: 'GET',
    path: '/api/v1/ai/word-of-the-day',
    kind: 'word_of_the_day',
  },
  { method: 'POST', path: '/api/v1/schedule/generate', kind: 'schedule' },
  { method: 'POST', path: '/api/v1/schedule/extend', kind: 'schedule_extend' },
  // Skills practice: the AI's grading of what the student wrote or said
  {
    method: 'POST',
    path: '/api/v1/skills/writing/submit',
    kind: 'writing_evaluation',
  },
  {
    method: 'POST',
    path: '/api/v1/skills/speaking/evaluate',
    kind: 'speaking_evaluation',
  },
  {
    method: 'POST',
    path: '/api/v1/skills/reading/submit',
    kind: 'reading_result',
  },
];

export function findAiLogRule(
  method: string,
  path: unknown,
): AiLogRule | undefined {
  if (typeof path !== 'string') return undefined;
  return AI_LOG_RULES.find((r) => r.method === method && r.path === path);
}
