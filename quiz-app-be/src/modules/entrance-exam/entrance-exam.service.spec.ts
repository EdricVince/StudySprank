import { Logger } from '@nestjs/common';

const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest
    .fn()
    .mockImplementation(() => ({ messages: { create: mockCreate } })),
}));

import { EntranceExamService } from './entrance-exam.service';

const reply = (text: string) => ({ content: [{ type: 'text', text }] });
const QUESTIONS = [
  {
    id: 1,
    section: 'Reading',
    type: 'mcq',
    passage: null,
    question: 'Q1?',
    options: ['a', 'b', 'c', 'd'],
    correct_answer: 2,
    explanation: 'because c',
  },
  {
    id: 2,
    section: 'Reading',
    type: 'mcq',
    passage: null,
    question: 'Q2?',
    options: ['a', 'b', 'c', 'd'],
    correct_answer: 0,
    explanation: 'because a',
  },
  {
    id: 3,
    section: 'Writing',
    type: 'essay',
    passage: null,
    question: 'Write.',
    options: [],
    correct_answer: -1,
    explanation: '',
  },
];

describe('EntranceExamService — answer key never leaves the server before submission', () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;
  let svc: EntranceExamService;
  let errSpy: jest.SpyInstance;

  beforeAll(() => {
    errSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });
  afterAll(() => {
    errSpy.mockRestore();
    process.env.ANTHROPIC_API_KEY = originalKey;
  });
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-testkey1234567890';
    mockCreate.mockReset();
    svc = new EntranceExamService();
  });

  it('generateExam strips correct_answer and explanation from every question', async () => {
    mockCreate.mockResolvedValueOnce(reply(JSON.stringify(QUESTIONS)));
    const exam = await svc.generateExam({ exam_type: 'ielts', variant: 0 });

    expect(exam.questions).toHaveLength(3);
    for (const q of exam.questions) {
      expect(q).not.toHaveProperty('correct_answer');
      expect(q).not.toHaveProperty('explanation');
      expect(q).toHaveProperty('options');
    }
    expect(JSON.stringify(exam)).not.toContain('because c');
  });

  it('still grades on the server and reveals the answer key only in the submit result', async () => {
    mockCreate
      .mockResolvedValueOnce(reply(JSON.stringify(QUESTIONS)))
      .mockResolvedValueOnce(reply('["r1","r2","r3","r4"]')); // recommendations
    const exam = await svc.generateExam({ exam_type: 'ielts', variant: 0 });

    const result = await svc.evaluateExam({
      exam_type: 'ielts',
      session_id: exam.session_id,
      answers: [
        { question_id: 1, selected: 2 },
        { question_id: 2, selected: 3 },
      ],
    });

    expect(result.correct).toBe(1);
    expect(result.total).toBe(2); // writing is not auto-scored
    expect(result.review).toEqual([
      { question_id: 1, correct_answer: 2, explanation: 'because c' },
      { question_id: 2, correct_answer: 0, explanation: 'because a' },
    ]);
  });
});
