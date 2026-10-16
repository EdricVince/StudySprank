import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { messageText, parseJsonObject } from '../../core/ai/ai-response';
import type { GetReadingDto, CefrLevel, ReadingType } from './dto/skills.dto';

// Diverse topic pools — Claude picks from these to prevent repetition
const TOPICS: Record<ReadingType, string[]> = {
  ielts: [
    'The history and future of coral reef ecosystems',
    'How urban green spaces affect mental health',
    'The science of sleep and its impact on learning',
    'Microplastics in the ocean food chain',
    'The rise of vertical farming in cities',
    'How ancient trade routes shaped modern cultures',
    'The psychology of decision-making under pressure',
    'Renewable energy storage challenges',
    'The decline of biodiversity in tropical forests',
    'How language shapes the way we perceive colour',
    'The role of gut bacteria in human immunity',
    'Space debris and the future of satellite technology',
    'The economics of gig work and freelancing',
    'Traditional medicine vs modern pharmacology',
    'How social media changes political behaviour',
    'The neuroscience of habit formation',
    'Underground cities and subterranean architecture',
    'The ethics of artificial intelligence in hiring',
  ],
  toeic: [
    'Flexible working policies post-pandemic',
    'Supply chain disruptions and global business',
    'Corporate sustainability reporting trends',
    'The growth of e-commerce logistics',
    'Employee wellness programmes ROI',
    'Remote team management best practices',
    'Digital transformation in manufacturing',
    'Customer experience in the subscription economy',
    'Cross-cultural communication in multinational teams',
    'Data privacy regulations and business compliance',
    'The rise of B2B software-as-a-service',
    'Workplace automation and reskilling workers',
  ],
  story: [
    'A lighthouse keeper who discovers a message in a bottle',
    'Two strangers stranded together during a snowstorm',
    'A chef who inherits a restaurant with a mysterious past',
    'A scientist who accidentally travels back to the 1960s',
    'A young musician auditioning in a new city',
    'An elderly woman teaching her grandchild a forgotten craft',
    'A park ranger who befriends an injured wolf',
    'A journalist uncovering a small town secret',
    'A student who finds an old diary in a library book',
    'A retired athlete coaching underprivileged youth',
    'Two rival bakers competing for a prestigious prize',
    "A traveller lost in a city where they don't speak the language",
  ],
  academic: [
    'Epigenetics and the inheritance of acquired traits',
    'The expanding universe and dark energy',
    'Cognitive load theory in educational design',
    'CRISPR gene editing: promise and ethical limits',
    'Quantum computing applications in cryptography',
    'The sociology of online communities',
    'Plate tectonics and earthquake prediction',
    'Neuroplasticity and recovery from brain injury',
    'The anthropology of gift-giving across cultures',
    'Climate modelling and prediction accuracy',
    'The role of mitochondria in cellular ageing',
    'Game theory and international trade negotiations',
  ],
  news: [
    'A new species discovered in a deep-sea expedition',
    'A city trialling a four-day working week',
    'Breakthrough in affordable solar panel technology',
    'A country achieving 100% renewable electricity',
    'Scientists developing edible food packaging',
    'A community restoring a polluted river to health',
    'Robots being tested as first responders in disasters',
    'Record number of tourists visiting a remote island',
    'A school replacing homework with community projects',
    'New app helping people reduce household food waste',
    'Ancient shipwreck discovered off the Mediterranean coast',
    'Urban beekeeping growing in popularity worldwide',
  ],
};

const WORD_COUNTS: Record<CefrLevel, number> = {
  A1: 120,
  A2: 180,
  B1: 280,
  B2: 380,
  C1: 480,
  C2: 550,
};

const TYPE_DESC: Record<ReadingType, string> = {
  story: 'an engaging English short story',
  ielts: 'an IELTS Academic reading passage',
  toeic: 'a TOEIC business reading passage (article, memo, or report)',
  academic: 'an academic research-style article',
  news: 'a news article',
};

@Injectable()
export class ReadingService {
  private readonly logger = new Logger(ReadingService.name);
  constructor() {}

  private get client(): Anthropic | null {
    const key = process.env.ANTHROPIC_API_KEY ?? '';
    return key && key.startsWith('sk-ant-')
      ? new Anthropic({ apiKey: key })
      : null;
  }

  async getPassage(dto: GetReadingDto) {
    const level = dto.level ?? 'B1';
    const type = dto.type ?? 'ielts';
    if (!this.client)
      throw new ServiceUnavailableException(
        'AI service not configured. Please add your Anthropic API key in admin settings.',
      );
    return this.generatePassage(level, type, dto.topic);
  }

  private pick(arr: string[]): string {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private async generatePassage(
    level: CefrLevel,
    type: ReadingType,
    topic?: string,
  ) {
    // Use caller-supplied topic if given, otherwise pick a fresh random one
    const chosenTopic = topic ?? this.pick(TOPICS[type] ?? TOPICS.ielts);
    const wc = WORD_COUNTS[level];

    const prompt = `Generate a ${level}-level reading exercise as ${TYPE_DESC[type]}.
Topic: "${chosenTopic}"
The passage must be specifically about this topic — do NOT choose a different subject.
Passage length: ~${wc} words. Vocabulary and grammar must match ${level}.

Return ONLY valid JSON (no markdown):
{
  "id": "r_${Date.now()}",
  "title": "passage title",
  "type": "${type}",
  "level": "${level}",
  "topic": "${chosenTopic}",
  "estimated_time": ${Math.round(wc / 130)},
  "word_count": ${wc},
  "passage": "Full passage (~${wc} words). Rich, varied vocabulary for ${level}. No padding.",
  "vocabulary": [
    {"word": "word", "phonetic": "/fəˈnetɪk/", "meaning": "definition", "example": "example sentence"}
  ],
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "Question about the passage?",
      "options": ["A. option", "B. option", "C. option", "D. option"],
      "correct": 0,
      "explanation": "Why this is correct, referencing the passage."
    }
  ],
  "summary": "2-sentence passage summary."
}
Generate 5 comprehension questions (varied: main idea, detail, inference, vocabulary-in-context). Vocabulary: 5 key words.`;

    try {
      const msg = await this.client!.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2200,
        messages: [{ role: 'user', content: prompt }],
      });
      return parseJsonObject(messageText(msg));
    } catch (e) {
      this.logger.error('Reading generation failed', e);
      throw new ServiceUnavailableException(
        'AI reading generation failed. Please try again.',
      );
    }
  }
}
