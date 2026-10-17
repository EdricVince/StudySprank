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
import type { EvaluateSpeakingDto, CefrLevel } from './dto/skills.dto';

@Injectable()
export class SpeakingService {
  private readonly logger = new Logger(SpeakingService.name);

  constructor() {}

  private get client() {
    return getAnthropicClient();
  }

  async getExercise(level: CefrLevel = 'B1') {
    if (!this.client) throw new ServiceUnavailableException(AI_NOT_CONFIGURED);
    return this.generateExercise(level);
  }

  async getSpeakingPrompt(level: CefrLevel = 'B1') {
    if (!this.client) throw new ServiceUnavailableException(AI_NOT_CONFIGURED);
    return this.generateSpeakingPrompt(level);
  }

  async evaluate(dto: EvaluateSpeakingDto) {
    if (!this.client) throw new ServiceUnavailableException(AI_NOT_CONFIGURED);
    return this.evaluateSpeaking(dto);
  }

  private readonly shadowingTopicsByLevel: Record<CefrLevel, string[]> = {
    A1: [
      'My Family',
      'My Home',
      'Numbers and Colors',
      'Days of the Week',
      'Food I Like',
      'The Weather Today',
      'Morning Routine',
      'Greetings',
    ],
    A2: [
      'My Best Friend',
      'A Day at School',
      'Shopping for Clothes',
      'My Weekend Activities',
      'A Birthday Party',
      'My Hobbies',
      'Going to the Market',
    ],
    B1: [
      'Working from Home',
      'A Memorable Holiday',
      'Social Media and Teenagers',
      'Healthy Eating Habits',
      'Learning a New Language',
      'Environmental Awareness',
      'City Life vs Village Life',
    ],
    B2: [
      'The Impact of Artificial Intelligence',
      'Urban Planning and Sustainability',
      'Mental Health in the Workplace',
      'The Gig Economy',
      'Climate Change Policy',
      'Digital Privacy Concerns',
    ],
    C1: [
      'The Ethics of Genetic Engineering',
      'Economic Inequality and Social Mobility',
      'The Psychology of Behavioural Change',
      'Geopolitical Shifts in the 21st Century',
      'Algorithmic Bias and Social Justice',
    ],
    C2: [
      'The Metaphysics of Identity Over Time',
      'The Epistemology of Scientific Knowledge',
      'Linguistic Relativity and Thought',
      'Transhumanism and the Boundaries of Humanity',
      'Postmodern Critiques of Grand Narratives',
    ],
  };

  private readonly wordCountByLevel: Record<CefrLevel, number> = {
    A1: 45,
    A2: 75,
    B1: 110,
    B2: 160,
    C1: 210,
    C2: 270,
  };

  private readonly speakingTopicsByLevel: Record<CefrLevel, string[]> = {
    A1: [
      'your name and age',
      'your family',
      'your favourite colour',
      'a pet you have or want',
      'food you like',
    ],
    A2: [
      'your school or work',
      'your hobbies',
      'your neighbourhood',
      'a recent weekend',
      'a person in your family',
    ],
    B1: [
      'a memorable trip you took',
      'a skill you want to learn',
      'your daily routine',
      'a book or film you enjoyed',
      'a challenge you faced',
      'technology you use every day',
    ],
    B2: [
      'the advantages and disadvantages of social media',
      'how technology is changing education',
      'the importance of cultural diversity',
      'work-life balance in modern society',
    ],
    C1: [
      'the impact of artificial intelligence on employment',
      'whether economic growth is compatible with environmental sustainability',
      'the role of the media in shaping public opinion',
    ],
    C2: [
      'the philosophical implications of a post-truth society',
      'whether liberal democracy is the most resilient political system',
      'how language shapes our perception of reality',
    ],
  };

  private async generateExercise(level: CefrLevel) {
    const topics = this.shadowingTopicsByLevel[level];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const wc = this.wordCountByLevel[level];
    const prompt = `Generate a ${level}-level English shadowing exercise on "${topic}".
The TEXT must be EXACTLY ~${wc} words of natural spoken English — complete sentences, no shortcuts.
Return ONLY valid JSON (no markdown):
{
  "id": "sp_${Date.now()}",
  "level": "${level}",
  "title": "concise exercise title",
  "topic": "${topic}",
  "text": "~${wc}-word shadowing text. Natural spoken English with varied vocabulary for ${level}. Full sentences, vivid detail.",
  "phonetic_highlights": [{"word": "word", "phonetic": "/fəˈnetɪk/", "tip": "Pronunciation tip"}],
  "key_phrases": [{"phrase": "phrase", "meaning": "meaning"}],
  "difficulty_notes": "What makes this text specifically challenging for ${level} learners"
}
phonetic_highlights: 4-6 words. key_phrases: 3-5 items.`;
    try {
      const msg = await this.client!.messages.create({
        model: AI_MODEL,
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      });
      return parseJsonObject(messageText(msg));
    } catch (e) {
      this.logger.error('Speaking exercise generation failed', e);
      throw new ServiceUnavailableException(
        'AI speaking exercise generation failed. Please try again.',
      );
    }
  }

  private async generateSpeakingPrompt(level: CefrLevel) {
    const topics = this.speakingTopicsByLevel[level];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const partWeights =
      level === 'A1' || level === 'A2' ? [1, 2] : [1, 2, 2, 3];
    const part = partWeights[Math.floor(Math.random() * partWeights.length)];
    const speakTime = part === 2 ? 120 : part === 3 ? 75 : 45;
    const prepTime = part === 2 ? 60 : 20;
    const partGuide =
      part === 1
        ? `Part 1 (personal questions): 2–3 personal questions about "${topic}". Simple direct questions.`
        : part === 2
          ? `Part 2 (cue card): "Describe ${topic}." followed by 4 bullet points starting with "You should say:".`
          : `Part 3 (abstract discussion): 2–3 analytical/opinion questions related to "${topic}". Higher order thinking.`;
    const prompt = `Generate a ${level}-level IELTS Speaking Part ${part} prompt about "${topic}".
${partGuide}
Vocabulary complexity must match ${level}.
Return ONLY valid JSON (no markdown):
{
  "id": "spq_${Date.now()}",
  "level": "${level}",
  "part": ${part},
  "topic": "3–5 word label",
  "question": "Full question text for Part ${part}",
  "bullet_points": ["say 1", "say 2", "say 3", "say 4"],
  "prep_time_seconds": ${prepTime},
  "speak_time_seconds": ${speakTime},
  "example_vocabulary": ["word1", "word2", "word3", "word4", "word5", "word6", "word7"]
}
bullet_points: 3–4 items. example_vocabulary: 6–8 words/phrases appropriate for ${level}.`;
    try {
      const msg = await this.client!.messages.create({
        model: AI_MODEL,
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      });
      return parseJsonObject(messageText(msg));
    } catch (e) {
      this.logger.error('Speaking prompt generation failed', e);
      throw new ServiceUnavailableException(
        'AI speaking prompt generation failed. Please try again.',
      );
    }
  }

  private async evaluateSpeaking(dto: EvaluateSpeakingDto) {
    const level = dto.level ?? 'B1';
    const prompt = `You are an expert English pronunciation coach. Compare the student's speech to the target text.
Target: "${dto.target_text}"
Student said: "${dto.spoken_transcript}"
Level: ${level}
Return ONLY valid JSON:
{
  "overall_score": 78, "pronunciation_score": 75, "fluency_score": 80, "accuracy_score": 78,
  "word_errors": [{"target_word": "target", "spoken_word": "spoken", "error_type": "substitution|omission|addition|mispronunciation", "tip": "correction tip"}],
  "missed_words": ["word1"], "extra_words": ["word1"],
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "phonetic_tips": [{"sound": "/θ/", "tip": "tip"}],
  "overall_feedback": "2–3 sentences of personalised, encouraging feedback."
}
word_errors: up to 6. strengths and improvements: 2–3 each. phonetic_tips: up to 3.`;
    try {
      const msg = await this.client!.messages.create({
        model: AI_MODEL,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      });
      return parseJsonObject(messageText(msg));
    } catch (e) {
      this.logger.error('Speaking evaluation failed', e);
      throw new ServiceUnavailableException(
        'AI speaking evaluation failed. Please try again.',
      );
    }
  }
}
