import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  AI_MODEL,
  AI_NOT_CONFIGURED,
  getAnthropicClient,
} from '../../core/ai/anthropic';
import { messageText, parseJsonObject } from '../../core/ai/ai-response';
import type {
  GetListeningDto,
  CefrLevel,
  ListeningType,
} from './dto/skills.dto';
import { SkillMaterialsService, stringField } from './skill-materials.service';

// Diverse topic pools per type to prevent repetitive generation
const TOPICS: Record<ListeningType, string[]> = {
  conversation: [
    'planning a surprise birthday party',
    'debating which film to watch on a Friday night',
    'discussing a recent neighbourhood change',
    'arranging a job interview time by phone',
    'two flatmates deciding how to split chores',
    'a customer complaining about a delayed delivery',
    'two friends comparing their holiday experiences',
    "a parent and teacher discussing a student's progress",
    'colleagues planning a team-building outing',
    'two people arguing about a parking incident',
    'a couple disagreeing on where to live',
    'friends deciding which restaurant to try',
  ],
  monologue: [
    'the benefits of cold-water swimming',
    'how to start composting at home',
    'the history of the Olympic Games',
    'a personal experience learning to drive',
    'why minimalism is trending among young people',
    'the impact of colour on mood and productivity',
    'how to prepare for a long-haul flight',
    'a travel experience in a remote location',
    'what it takes to run a marathon',
    'the rise of plant-based diets',
    'how to negotiate a salary raise',
    'lessons learned from starting a small business',
  ],
  ielts: [
    'a museum curator explaining an upcoming exhibition',
    'a student asking about library membership',
    'a tour guide describing a national park',
    'a university orientation for international students',
    'a health professional explaining a study on sleep',
    'a housing officer and student discussing accommodation',
    'a radio documentary about urban wildlife',
    'a seminar on sustainable architecture',
    'a lecture on the psychology of motivation',
    'a panel discussion on climate adaptation strategies',
  ],
  lecture: [
    'the cognitive effects of bilingualism',
    'plate tectonics and volcanic activity',
    'the economics of microfinance in developing countries',
    'the role of fungi in forest ecosystems',
    'how social media algorithms shape public opinion',
    'the neuroscience of creativity',
    'the history and future of nuclear fusion',
    'how ancient Rome managed its water supply',
    'the rise of behavioural economics',
    'the ethics of autonomous vehicles',
    'how vaccines work at a cellular level',
    'the physics of black holes explained simply',
  ],
};

// Named speaker pairs for realistic dialogues (not generic A/B)
const SPEAKER_PAIRS = [
  ['Sarah', 'James'],
  ['Priya', 'Tom'],
  ['Maria', 'David'],
  ['Yuki', 'Alex'],
  ['Leila', 'Chris'],
  ['Amara', 'Ben'],
  ['Sofia', 'Oliver'],
  ['Nadia', 'Ryan'],
];

const WORD_COUNTS: Record<CefrLevel, number> = {
  A1: 80,
  A2: 130,
  B1: 200,
  B2: 280,
  C1: 350,
  C2: 420,
};

const TYPE_DESC: Record<ListeningType, string> = {
  conversation: 'a natural dialogue between 2 people',
  monologue: 'a monologue or short informal talk',
  ielts: 'an IELTS Listening section script (interview, tour, or talk)',
  lecture: 'an academic lecture excerpt',
};

@Injectable()
export class ListeningService {
  private readonly logger = new Logger(ListeningService.name);
  constructor(private readonly materials: SkillMaterialsService) {}

  private get client() {
    return getAnthropicClient();
  }

  async getExercise(dto: GetListeningDto, userId?: number) {
    const level = dto.level ?? 'B1';
    const type = dto.type ?? 'monologue';
    if (!this.client) throw new ServiceUnavailableException(AI_NOT_CONFIGURED);
    const exercise = await this.generateExercise(level, type);
    // Keep the generated script + questions in the database.
    await this.materials.save({
      skill: 'listening',
      kind: type,
      level,
      topic: stringField(exercise, 'topic'),
      content: exercise,
      userId,
    });
    return exercise;
  }

  private pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private async generateExercise(level: CefrLevel, type: ListeningType) {
    const topic = this.pick(TOPICS[type] ?? TOPICS.monologue);
    const wc = WORD_COUNTS[level];
    const [spkA, spkB] = this.pick(SPEAKER_PAIRS);

    // Dialogue types use named speakers; solo types don't need a second speaker
    const isDialogue = type === 'conversation';
    const speakerNote = isDialogue
      ? `Label speakers as "${spkA}:" and "${spkB}:". Alternate naturally.`
      : 'Single speaker. Natural, varied pace.';

    const prompt = `Generate a ${level}-level listening exercise as ${TYPE_DESC[type]}.
Topic: "${topic}"
Script: ~${wc} words of natural spoken English. ${speakerNote}
Vocabulary and complexity must match ${level}. Make it engaging and topic-specific — do NOT use a generic script.

Return ONLY valid JSON (no markdown):
{
  "id": "l_${Date.now()}",
  "title": "Descriptive exercise title",
  "type": "${type}",
  "level": "${level}",
  "topic": "${topic}",
  "duration_seconds": ${Math.round(wc / 2.2)},
  "script": "Full script (~${wc} words). Natural spoken English.",
  "speakers": ${isDialogue ? `["${spkA}", "${spkB}"]` : `["Narrator"]`},
  "questions": [
    {
      "id": 1,
      "question": "Comprehension question?",
      "options": ["A. option", "B. option", "C. option", "D. option"],
      "correct": 0,
      "explanation": "Why this is correct."
    }
  ],
  "key_phrases": [
    {"phrase": "phrase from script", "meaning": "meaning"}
  ]
}
Generate 4 comprehension questions (mix of: main idea, specific detail, inference, speaker attitude). Key phrases: 4 items.`;

    try {
      const msg = await this.client!.messages.create({
        model: AI_MODEL,
        max_tokens: 1800,
        messages: [{ role: 'user', content: prompt }],
      });
      return parseJsonObject(messageText(msg));
    } catch (e) {
      this.logger.error('Listening generation failed', e);
      throw new ServiceUnavailableException(
        'AI listening generation failed. Please try again.',
      );
    }
  }
}
