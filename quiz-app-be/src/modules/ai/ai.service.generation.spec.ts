import { Logger, ServiceUnavailableException } from '@nestjs/common';

// Mock the Anthropic SDK so we exercise the real prompt/parse logic without any
// network call. `mockCreate` is hoisted-safe (name starts with "mock").
const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest
    .fn()
    .mockImplementation(() => ({ messages: { create: mockCreate } })),
}));

import { AiService } from './ai.service';

const reply = (text: string) => ({ content: [{ type: 'text', text }] });

describe('AiService — AI generation paths (Anthropic mocked)', () => {
  const KEY = 'sk-ant-testkey1234567890';
  const originalKey = process.env.ANTHROPIC_API_KEY;
  let svc: AiService;

  // The failure-path tests below deliberately reject the mocked model call, which
  // makes AiService log an error. Mute it so the suite output stays clean.
  let errSpy: jest.SpyInstance;
  beforeAll(() => {
    errSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });
  afterAll(() => {
    errSpy.mockRestore();
  });

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = KEY; // makes the lazy client non-null
    mockCreate.mockReset();
    svc = new AiService();
  });
  afterAll(() => {
    process.env.ANTHROPIC_API_KEY = originalKey;
  });

  describe('getWordOfTheDay', () => {
    it('parses the model JSON into a WordOfTheDay', async () => {
      mockCreate.mockResolvedValue(
        reply(
          JSON.stringify({
            word: 'serendipity',
            phonetic: '/ˌsɛrənˈdɪpɪti/',
            partOfSpeech: 'noun',
            definition: 'a happy accident',
            example: 'It was serendipity.',
            synonyms: ['luck'],
            difficulty: 'advanced',
            tip: 'ser-en-DIP-ity',
          }),
        ),
      );
      const w = await svc.getWordOfTheDay();
      expect(w.word).toBe('serendipity');
      expect(w.difficulty).toBe('advanced');
      expect(w.synonyms).toEqual(['luck']);
    });

    it('tolerates prose / markdown fences around the JSON', async () => {
      mockCreate.mockResolvedValue(
        reply(
          'Sure! Here you go:\n```json\n' +
            JSON.stringify({
              word: 'ephemeral',
              phonetic: 'p',
              partOfSpeech: 'adjective',
              definition: 'd',
              example: 'e',
              synonyms: [],
              difficulty: 'intermediate',
              tip: 't',
            }) +
            '\n```',
        ),
      );
      const w = await svc.getWordOfTheDay();
      expect(w.word).toBe('ephemeral');
    });

    it('throws ServiceUnavailable when the model call fails', async () => {
      mockCreate.mockRejectedValue(new Error('upstream down'));
      await expect(svc.getWordOfTheDay()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe('scanContent', () => {
    it('parses structured lesson content from pasted text', async () => {
      mockCreate.mockResolvedValue(
        reply(
          JSON.stringify({
            title: 'Photosynthesis',
            summary: 'How plants make food.',
            language: 'English',
            vocabulary: [
              {
                term: 'chlorophyll',
                definition: 'green pigment',
                example: 'Leaves have chlorophyll.',
              },
            ],
            quiz: [
              {
                question: 'What is needed?',
                options: ['sun', 'a', 'b', 'c'],
                correct: 0,
                explanation: 'light',
              },
            ],
            comprehension: [{ question: 'Why green?', answer: 'chlorophyll' }],
          }),
        ),
      );
      const res = await svc.scanContent({
        text: 'Photosynthesis is the process by which plants convert light into energy. '.repeat(
          3,
        ),
      });
      expect(res.title).toBe('Photosynthesis');
      expect(res.vocabulary).toHaveLength(1);
      expect(res.quiz[0].correct).toBe(0);
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateLesson', () => {
    it('parses a generated lesson and passes the skill/level into the prompt', async () => {
      mockCreate.mockResolvedValue(
        reply(
          JSON.stringify({
            title: 'Past Simple vs Present Perfect',
            description: 'Compare the two tenses.',
            category: 'grammar',
            difficulty: 'Intermediate (B1)',
            content: {
              vocabulary: [
                {
                  term: 'already',
                  definition: 'before now',
                  example: 'I have already eaten.',
                },
              ],
              quiz: [
                {
                  question: 'Pick the present perfect',
                  options: ['a', 'b', 'c', 'd'],
                  correct: 1,
                  explanation: 'has+pp',
                },
              ],
              comprehension: [
                { question: 'When to use?', answer: 'unfinished time' },
              ],
            },
          }),
        ),
      );
      const lesson = await svc.generateLesson({
        skill: 'grammar',
        level: 'Intermediate (B1)',
        language: 'en',
        topic: 'tenses',
      });
      expect(lesson.title).toContain('Present Perfect');
      expect(lesson.category).toBe('grammar');
      expect(lesson.content.quiz[0].correct).toBe(1);
      const prompt = mockCreate.mock.calls[0][0].messages[0].content as string;
      expect(prompt).toContain('grammar');
      expect(prompt).toContain('Intermediate (B1)');
    });

    it('backfills category/difficulty/content when the model omits them', async () => {
      mockCreate.mockResolvedValue(
        reply(JSON.stringify({ title: 'T', description: 'D' })),
      );
      const lesson = await svc.generateLesson({
        skill: 'writing',
        level: 'IELTS 6.5',
      });
      expect(lesson.category).toBe('writing');
      expect(lesson.difficulty).toBe('IELTS 6.5');
      expect(lesson.content).toEqual({
        vocabulary: [],
        quiz: [],
        comprehension: [],
      });
    });

    it('throws ServiceUnavailable when the model call fails', async () => {
      mockCreate.mockRejectedValue(new Error('upstream down'));
      await expect(
        svc.generateLesson({ skill: 'reading', level: 'B1' }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('generateVocabularySet', () => {
    it('parses a generated set and drops words missing a term/definition', async () => {
      mockCreate.mockResolvedValue(
        reply(
          JSON.stringify({
            name: 'Business Meetings',
            words: [
              {
                term: 'agenda',
                definition: 'list of topics',
                example: 'The agenda is long.',
              },
              { term: '', definition: 'x', example: 'y' }, // dropped (no term)
              { term: 'adjourn', definition: '', example: 'z' }, // dropped (no definition)
            ],
          }),
        ),
      );
      const set = await svc.generateVocabularySet({
        topic: 'Business meetings',
        level: 'IELTS 6.5',
        language: 'en',
        count: 3,
      });
      expect(set.name).toBe('Business Meetings');
      expect(set.words).toHaveLength(1);
      expect(set.words[0].term).toBe('agenda');
    });

    it('throws ServiceUnavailable when the model call fails', async () => {
      mockCreate.mockRejectedValue(new Error('upstream down'));
      await expect(
        svc.generateVocabularySet({ topic: 'travel', level: 'A2' }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });
});
