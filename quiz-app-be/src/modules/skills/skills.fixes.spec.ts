import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { extractJsonObject } from './writing.service';
import { ReadingController } from './reading.controller';
import { SubmitReadingDto } from './dto/skills.dto';

describe('WritingService — extractJsonObject (no more silent `{}`)', () => {
  it('parses the JSON object out of a reply with prose/fences', () => {
    expect(
      extractJsonObject(
        'Here you go:\n```json\n{"overall_band": 6.5}\n```',
        'overall_band',
      ),
    ).toEqual({ overall_band: 6.5 });
  });

  it('throws when the reply has no JSON object (was: returned {})', () => {
    expect(() => extractJsonObject('Sorry, I cannot help with that.')).toThrow(
      'No JSON object',
    );
    expect(() => extractJsonObject(undefined)).toThrow('No JSON object');
  });

  it('throws when a required key is missing (an evaluation without a band)', () => {
    expect(() =>
      extractJsonObject('{"summary": "ok"}', 'overall_band'),
    ).toThrow('missing "overall_band"');
  });
});

describe('Reading submit', () => {
  const ctrl = new ReadingController({} as any);
  const q = (correct: number) => ({
    question: 'q',
    options: ['a', 'b', 'c', 'd'],
    correct,
  });

  it('scores per question and ignores extra answers', () => {
    const res = ctrl.submit({
      passage_id: 'p',
      answers: [1, 0, 3, 2],
      questions: [q(1), q(2)],
    } as any);
    expect(res.data).toEqual({
      correct: 1,
      total: 2,
      score: 50,
      passed: false,
    });
  });

  it('rejects an empty question list in validation (was: NaN score)', async () => {
    const errors = await validate(
      plainToInstance(SubmitReadingDto, {
        passage_id: 'p',
        answers: [],
        questions: [],
      }),
    );
    expect(errors.map((e) => e.property)).toContain('questions');
  });
});
