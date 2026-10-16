import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { assertPublicUrl } from '../../core/security/ssrf';

export interface ImportedContent {
  title: string;
  summary: string;
  language: string;
  vocabulary: { term: string; definition: string; example: string }[];
  quiz: {
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  }[];
  comprehension: { question: string; answer: string }[];
}

export interface WordOfTheDay {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  synonyms: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tip: string;
}

export interface VocabularyItem {
  term: string;
  meaning: string;
  explanation: string;
  example: string;
}

export interface GeneratedLesson {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  content: {
    reading?: string;
    vocabulary: { term: string; definition: string; example: string }[];
    quiz: {
      question: string;
      options: string[];
      correct: number;
      explanation: string;
    }[];
    comprehension: { question: string; answer: string }[];
  };
}

export interface GeneratedVocabSet {
  name: string;
  words: { term: string; definition: string; example: string }[];
}

export interface GeneratedTest {
  title: string;
  questions: {
    question: string;
    options: string[];
    correct: number;
    points: number;
  }[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private cache: { date: string; word: WordOfTheDay } | null = null;

  constructor() {}

  private get client(): Anthropic | null {
    const key = process.env.ANTHROPIC_API_KEY ?? '';
    return key && key.startsWith('sk-ant-')
      ? new Anthropic({ apiKey: key })
      : null;
  }

  async scanContent(dto: {
    url?: string;
    text?: string;
    language?: string;
  }): Promise<ImportedContent> {
    let rawText = dto.text?.trim() || '';

    // Bad input → 400 (BadRequestException); AI side problems → 503.
    if (dto.url) {
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(dto.url);
      } catch {
        throw new BadRequestException('Invalid URL format.');
      }
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new BadRequestException(
          'Only HTTP and HTTPS URLs are supported.',
        );
      }
      // SSRF guard: resolve DNS and refuse private/loopback/link-local targets
      // (IPv4, IPv6, 0.0.0.0, IPv4-mapped). Redirects are not followed, so a
      // public URL cannot bounce the request to an internal address.
      try {
        await assertPublicUrl(parsedUrl);
      } catch (e) {
        throw new BadRequestException((e as Error).message);
      }
      let res: Response;
      try {
        res = await fetch(parsedUrl.toString(), {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StudySpark/1.0)' },
          signal: AbortSignal.timeout(10000),
          redirect: 'manual',
        });
      } catch {
        throw new BadRequestException(
          'Cannot fetch URL. Try pasting the text directly.',
        );
      }
      if (res.status >= 300 && res.status < 400) {
        throw new BadRequestException(
          'The URL redirects elsewhere — redirects are not followed. Paste the final URL or the text directly.',
        );
      }
      try {
        const html = await res.text();
        rawText = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 12000);
      } catch {
        throw new BadRequestException(
          'Cannot fetch URL. Try pasting the text directly.',
        );
      }
    }

    if (!rawText || rawText.length < 80) {
      throw new BadRequestException(
        'Not enough content to analyze. Please provide more text.',
      );
    }

    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI service not configured. Set ANTHROPIC_API_KEY in environment.',
      );
    }

    const lang = dto.language || 'English';
    const prompt = `You are a language teacher assistant. Analyze the following text and generate structured learning content in ${lang}.
Return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:
{
  "title": "concise lesson title",
  "summary": "2-3 sentence summary of the main topic",
  "language": "${lang}",
  "vocabulary": [
    {"term": "keyword from text", "definition": "clear definition", "example": "natural example sentence"}
  ],
  "quiz": [
    {"question": "question about the content", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "why this is correct"}
  ],
  "comprehension": [
    {"question": "open-ended question", "answer": "ideal answer"}
  ]
}

Generate:
- 10 to 15 vocabulary items (important words/phrases from the text)
- 8 multiple-choice quiz questions testing comprehension
- 4 comprehension questions requiring short answers

TEXT:
${rawText}`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = (
        response.content[0] as { type: string; text: string }
      ).text.trim();
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      const jsonStr = text.slice(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonStr) as ImportedContent;
    } catch (err) {
      this.logger.error('scanContent error', err);
      throw new ServiceUnavailableException(
        'AI failed to parse content. Please try again.',
      );
    }
  }

  private langName(code: string): string {
    const map: Record<string, string> = {
      en: 'English',
      vi: 'Vietnamese',
      zh: 'Chinese (Simplified)',
    };
    return map[code] ?? 'English';
  }

  /**
   * Generate a fresh, diverse batch of vocabulary for flashcard practice.
   * `learningLang` is the language being studied; `uiLang` is the learner's own
   * language used for the meaning + explanation. `exclude` lets the caller skip
   * words already seen so each batch feels new.
   */
  async generateVocabulary(dto: {
    learningLang: string;
    uiLang: string;
    count?: number;
    exclude?: string[];
  }): Promise<VocabularyItem[]> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI service not configured. Please add your Anthropic API key in admin settings.',
      );
    }

    const count = Math.min(Math.max(dto.count ?? 15, 1), 30);
    const learn = this.langName(dto.learningLang);
    const ui = this.langName(dto.uiLang);

    // Rotate through themes so consecutive batches don't repeat the same words.
    const themes = [
      'everyday life',
      'food and cooking',
      'travel',
      'work and office',
      'technology',
      'nature and weather',
      'emotions and feelings',
      'health and the body',
      'shopping and money',
      'education',
      'hobbies and sports',
      'family and relationships',
      'the city and directions',
      'time and dates',
      'houses and furniture',
      'arts and music',
    ];
    const pickedThemes = [...themes]
      .sort(() => Math.random() - 0.5)
      .slice(0, 4);
    const exclude = (dto.exclude ?? []).filter(Boolean).slice(0, 60);
    const excludeLine = exclude.length
      ? `Do NOT include any of these already-seen words: ${exclude.join(', ')}.`
      : '';

    const pinyinHint =
      dto.learningLang === 'zh'
        ? ' with pinyin in parentheses, e.g. 苹果 (píngguǒ)'
        : '';

    const prompt = `You are a ${learn} vocabulary teacher for a ${ui}-speaking learner.
Generate ${count} DIVERSE and USEFUL ${learn} vocabulary words. Spread them across varied topics (for example: ${pickedThemes.join(', ')}) and mix beginner to intermediate difficulty. Avoid the same predictable textbook words every time — make each batch feel fresh and varied.
${excludeLine}
Return ONLY a valid JSON array (no markdown, no code fences) of exactly ${count} objects with this structure:
[
  {
    "term": "the word in ${learn}${pinyinHint}",
    "meaning": "the short meaning in ${ui}",
    "explanation": "one simple, easy sentence in ${ui} explaining what the word means or when to use it, so a learner clearly understands it",
    "example": "a natural example sentence in ${learn}"
  }
]`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw = (response.content[0] as { type: string; text: string }).text;
      const json = raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1);
      const items = JSON.parse(json) as VocabularyItem[];
      return items.filter((i) => i && i.term && i.meaning);
    } catch (err) {
      this.logger.error('generateVocabulary failed', err);
      throw new ServiceUnavailableException(
        'AI failed to generate vocabulary. Please try again.',
      );
    }
  }

  /**
   * Generate a full teacher lesson for a chosen skill (writing/listening/vocabulary/
   * grammar/speaking/reading/test-prep) at a chosen level/band. Returns content in the
   * lesson jsonb shape (vocabulary + quiz + comprehension) so it can be saved directly.
   */
  async generateLesson(dto: {
    skill: string;
    level: string;
    language?: string;
    meaningLanguage?: string;
    topic?: string;
  }): Promise<GeneratedLesson> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI service not configured. Please add your Anthropic API key in admin settings.',
      );
    }

    const lang = this.langName(dto.language ?? 'en');
    const meaningLang = this.langName(
      dto.meaningLanguage ?? dto.language ?? 'en',
    );
    const bilingual = meaningLang !== lang;
    const skill = (dto.skill || 'vocabulary').trim();
    const level = (dto.level || 'Intermediate (B1)').trim();
    const topicLine = dto.topic?.trim()
      ? `Focus the lesson on this topic: "${dto.topic.trim()}".`
      : 'Pick a useful, engaging topic appropriate for the skill and level.';
    const definitionHint = bilingual
      ? `the meaning/translation of the term in ${meaningLang} (so a ${meaningLang}-speaking learner understands it)`
      : 'clear meaning';

    const prompt = `You are an expert ${lang} teacher creating a classroom lesson.
Skill focus: ${skill}. Target level: ${level}. ${topicLine}
Tailor the difficulty, vocabulary and questions precisely to the ${level} level, and shape the
content to the "${skill}" skill (e.g. grammar → rule-focused; writing → useful phrases + model ideas;
listening/speaking → a short dialogue/script in comprehension; reading → a passage; test-prep → exam-style items).
${bilingual ? `IMPORTANT: keep each vocabulary "term" and "example" in ${lang}, but write each "definition" as the meaning in ${meaningLang} so learners understand it.` : ''}
Return ONLY a valid JSON object (no markdown, no code fences) with exactly this structure:
{
  "title": "concise lesson title",
  "description": "2-3 sentence overview of what students will learn",
  "category": "${skill}",
  "difficulty": "${level}",
  "content": {
    "reading": "a short, coherent ${lang} reading passage (4-6 sentences, one paragraph) about the topic, written at the ${level} level",
    "vocabulary": [{"term": "word/phrase in ${lang}", "definition": "${definitionHint}", "example": "natural example sentence in ${lang}"}],
    "quiz": [{"question": "question text", "options": ["A","B","C","D"], "correct": 0, "explanation": "why this is correct"}],
    "comprehension": [{"question": "a reading-comprehension question in ${lang} that can ONLY be answered by reading the passage above", "answer": "the correct answer, taken from / based on the passage"}]
  }
}
Generate the reading passage, 8-12 vocabulary items, 6 multiple-choice quiz questions (correct = index of the right option), and 3 comprehension questions that test understanding of the reading passage (not open-ended opinion/speaking prompts).`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });
      const raw = (response.content[0] as { type: string; text: string }).text;
      const json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
      const lesson = JSON.parse(json) as GeneratedLesson;
      lesson.category ||= skill;
      lesson.difficulty ||= level;
      lesson.content ??= { vocabulary: [], quiz: [], comprehension: [] };
      return lesson;
    } catch (err) {
      this.logger.error('generateLesson failed', err);
      throw new ServiceUnavailableException(
        'AI failed to generate the lesson. Please try again.',
      );
    }
  }

  /**
   * Generate a vocabulary set (name + words) for a topic at a chosen level/band, in the
   * target language. Each word carries a definition and an example sentence.
   */
  async generateVocabularySet(dto: {
    topic: string;
    level: string;
    language?: string;
    meaningLanguage?: string;
    count?: number;
  }): Promise<GeneratedVocabSet> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI service not configured. Please add your Anthropic API key in admin settings.',
      );
    }

    const lang = this.langName(dto.language ?? 'en');
    const meaningLang = this.langName(
      dto.meaningLanguage ?? dto.language ?? 'en',
    );
    const bilingual = meaningLang !== lang;
    const level = (dto.level || 'Intermediate (B1)').trim();
    const topic = (dto.topic || 'everyday vocabulary').trim();
    const count = Math.min(Math.max(dto.count ?? 15, 4), 40);
    const definitionHint = bilingual
      ? `the meaning/translation in ${meaningLang} (so a ${meaningLang}-speaking learner understands it)`
      : 'clear meaning/translation';

    const prompt = `You are a ${lang} vocabulary teacher building a study set.
Topic: "${topic}". Target level: ${level}. Generate ${count} useful ${lang} words/phrases fitting this topic and level.
Match the difficulty to ${level}.${bilingual ? ` Keep each "term" and "example" in ${lang}, but write each "definition" as the meaning in ${meaningLang}.` : ''}
Return ONLY a valid JSON object (no markdown, no code fences):
{
  "name": "a short set name for this topic",
  "words": [{"term": "word/phrase in ${lang}", "definition": "${definitionHint}", "example": "natural example sentence in ${lang}"}]
}
Include exactly ${count} words.`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });
      const raw = (response.content[0] as { type: string; text: string }).text;
      const json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
      const set = JSON.parse(json) as GeneratedVocabSet;
      set.name ||= topic;
      set.words = (set.words ?? []).filter((w) => w && w.term && w.definition);
      return set;
    } catch (err) {
      this.logger.error('generateVocabularySet failed', err);
      throw new ServiceUnavailableException(
        'AI failed to generate the vocabulary set. Please try again.',
      );
    }
  }

  /** Generate a multiple-choice test (title + questions) for a topic at a level. */
  async generateTest(dto: {
    topic: string;
    level: string;
    language?: string;
    count?: number;
  }): Promise<GeneratedTest> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI service not configured. Please add your Anthropic API key in admin settings.',
      );
    }
    const lang = this.langName(dto.language ?? 'en');
    const level = (dto.level || 'Intermediate (B1)').trim();
    const topic = (dto.topic || 'general knowledge').trim();
    const count = Math.min(Math.max(dto.count ?? 8, 1), 20);

    const prompt = `You are a ${lang} teacher writing a multiple-choice test.
Topic: "${topic}". Target level: ${level}. Write ${count} clear multiple-choice questions in ${lang}, each with exactly 4 options and one correct answer.
Return ONLY a valid JSON object (no markdown, no code fences):
{
  "title": "a short test title for this topic",
  "questions": [
    {"question": "the question text in ${lang}", "options": ["A","B","C","D"], "correct": 0, "points": 1}
  ]
}
"correct" is the 0-based index of the right option. Include exactly ${count} questions.`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3072,
        messages: [{ role: 'user', content: prompt }],
      });
      const raw = (response.content[0] as { type: string; text: string }).text;
      const json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
      const test = JSON.parse(json) as GeneratedTest;
      test.title ||= topic;
      test.questions = (test.questions ?? [])
        .filter(
          (q) =>
            q &&
            q.question &&
            Array.isArray(q.options) &&
            q.options.length >= 2,
        )
        .map((q) => ({
          question: q.question,
          options: q.options,
          correct: Math.min(
            Math.max(Number(q.correct) || 0, 0),
            q.options.length - 1,
          ),
          points: q.points && q.points > 0 ? q.points : 1,
        }));
      return test;
    } catch (err) {
      this.logger.error('generateTest failed', err);
      throw new ServiceUnavailableException(
        'AI failed to generate the test. Please try again.',
      );
    }
  }

  async getWordOfTheDay(fresh = false): Promise<WordOfTheDay> {
    const today = new Date().toDateString();
    // Daily cache keeps the same word for the whole day; `fresh` (the refresh
    // button) skips it to pull a brand-new random word on demand.
    if (!fresh && this.cache?.date === today) return this.cache.word;

    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI service not configured. Please add your Anthropic API key in admin settings.',
      );
    }

    // A random seed (theme + starting letter) so each day — and each refresh —
    // lands on a genuinely different word instead of the model's usual favourites.
    const themes = [
      'everyday life',
      'nature & science',
      'emotions & feelings',
      'work & business',
      'travel & places',
      'food & cooking',
      'art & music',
      'technology',
      'personality & character',
      'time & change',
      'communication',
      'movement & action',
    ];
    const theme = themes[Math.floor(Math.random() * themes.length)];
    const letter = 'abcdefghijklmnoprstuvw'[Math.floor(Math.random() * 22)];

    try {
      const response = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [
          {
            role: 'user',
            content: `Generate a Word of the Day for an English learning app. Today is ${today}.
Return ONLY valid JSON (no markdown) with this exact structure:
{
  "word": "string",
  "phonetic": "IPA pronunciation",
  "partOfSpeech": "noun/verb/adjective/adverb",
  "definition": "clear definition under 20 words",
  "example": "natural example sentence",
  "synonyms": ["word1", "word2", "word3"],
  "difficulty": "beginner|intermediate|advanced",
  "tip": "fun memory trick or etymology tip"
}
Pick an interesting, useful English word related to "${theme}", ideally starting with "${letter}". Not too common, not too obscure. Surprise me with a different word each time.`,
          },
        ],
      });

      const raw = (response.content[0] as { type: string; text: string }).text;
      // Robustly extract the JSON object (Claude may wrap it in prose / markdown fences)
      const json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
      const word = JSON.parse(json) as WordOfTheDay;
      this.cache = { date: today, word };
      return word;
    } catch (err) {
      this.logger.error('Word of the day generation failed', err);
      throw new ServiceUnavailableException(
        'AI failed to generate the word of the day. Please try again.',
      );
    }
  }
}
