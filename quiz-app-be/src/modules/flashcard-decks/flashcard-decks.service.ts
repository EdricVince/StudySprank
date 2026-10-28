import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FlashcardDeck, DeckCard } from './entities/flashcard-deck.entity';
import { Class } from '../classes/entities/class.entity';
import { ClassEnrollment } from '../classes/entities/class-enrollment.entity';
import { ROLE_TEACHER } from '../roles/entities/role.entity';
import { canReadDeck } from './deck-access';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsInt,
  Min,
} from 'class-validator';

export class CreateFlashcardDeckDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsBoolean() is_public?: boolean;
  @IsOptional() @IsArray() cards?: DeckCard[];
  /** Assign the deck to one of the teacher's classes (teachers only). */
  @IsOptional() @IsInt() @Min(1) class_id?: number;
}

export class UpdateFlashcardDeckDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsBoolean() is_public?: boolean;
  @IsOptional() @IsArray() cards?: DeckCard[];
  /** A class id assigns the deck to that class, null takes it back out. */
  @IsOptional() @IsInt() @Min(1) class_id?: number | null;
}

/** The signed-in user, as far as deck permissions are concerned. */
export interface DeckActor {
  role_id: number;
  teacher_status?: string;
}

@Injectable()
export class FlashcardDecksService {
  constructor(
    @InjectRepository(FlashcardDeck)
    private deckRepo: Repository<FlashcardDeck>,
  ) {}

  /** Only an approved teacher may put a deck into a class — and only into their own class. */
  private async assertCanAssign(
    classId: number,
    userId: number,
    actor?: DeckActor,
  ): Promise<void> {
    if (
      actor?.role_id !== ROLE_TEACHER ||
      actor.teacher_status !== 'approved'
    ) {
      throw new ForbiddenException(
        'Only teachers can assign a deck to a class',
      );
    }
    const own = await this.deckRepo.manager.findOne(Class, {
      where: { id: classId, teacher_id: userId },
      select: ['id'],
    });
    if (!own) throw new ForbiddenException('Not your class');
  }

  private isEnrolled(userId: number) {
    return async (classId: number): Promise<boolean> =>
      !!(await this.deckRepo.manager.findOne(ClassEnrollment, {
        where: { class_id: classId, student_id: userId },
        select: ['id'],
      }));
  }

  async create(
    ownerId: number,
    dto: CreateFlashcardDeckDto,
    actor?: DeckActor,
  ): Promise<FlashcardDeck> {
    if (dto.class_id != null) {
      await this.assertCanAssign(dto.class_id, ownerId, actor);
    }
    const deck = this.deckRepo.create({
      owner_id: ownerId,
      title: dto.title,
      description: dto.description ?? null,
      category: dto.category ?? 'General',
      cards: dto.cards ?? [],
      class_id: dto.class_id ?? null,
      // A class deck is never public: only the class sees it.
      is_public: dto.class_id != null ? false : (dto.is_public ?? true),
    });
    return this.deckRepo.save(deck);
  }

  /**
   * Everything the user can open: their own decks (public, private or for a class),
   * every other user's PUBLIC decks, and the decks of the classes they are enrolled in.
   * Each deck is annotated with its owner's role + name so the client can split
   * "from teachers" vs "student community" decks.
   */
  async findForUser(
    userId: number,
  ): Promise<
    (FlashcardDeck & { owner_role: number; owner_name: string | null })[]
  > {
    const { entities, raw } = await this.deckRepo
      .createQueryBuilder('d')
      .leftJoin('users', 'u', 'u.id = d.owner_id')
      .addSelect('u.role_id', 'owner_role')
      .addSelect('u.name', 'owner_name')
      .where(
        `d.owner_id = :userId
         OR (d.is_public = true AND d.class_id IS NULL)
         OR d.class_id IN (SELECT e.class_id FROM class_enrollments e WHERE e.student_id = :userId)`,
        { userId },
      )
      .orderBy('d.created_at', 'DESC')
      .getRawAndEntities();
    const rows = raw as Array<{
      owner_role?: unknown;
      owner_name?: string | null;
    }>;
    return entities.map((deck, i) => ({
      ...deck,
      owner_role: Number(rows[i]?.owner_role) || 0,
      owner_name: rows[i]?.owner_name ?? null,
    }));
  }

  async findOne(id: number, userId: number): Promise<FlashcardDeck> {
    const deck = await this.deckRepo.findOne({ where: { id } });
    if (!deck) throw new NotFoundException('Flashcard deck not found');
    if (!(await canReadDeck(deck, userId, this.isEnrolled(userId)))) {
      throw new ForbiddenException(
        deck.class_id != null
          ? 'This deck belongs to a class you are not in'
          : 'This deck is private',
      );
    }
    return deck;
  }

  async update(
    id: number,
    userId: number,
    dto: UpdateFlashcardDeckDto,
    actor?: DeckActor,
  ): Promise<FlashcardDeck> {
    const deck = await this.deckRepo.findOne({ where: { id } });
    if (!deck) throw new NotFoundException('Flashcard deck not found');
    if (deck.owner_id !== userId) throw new ForbiddenException('Not your deck');
    if (dto.class_id != null) {
      await this.assertCanAssign(dto.class_id, userId, actor);
    }
    Object.assign(deck, dto);
    // Keep class decks out of the public library.
    if (deck.class_id != null) deck.is_public = false;
    return this.deckRepo.save(deck);
  }

  async remove(id: number, userId: number): Promise<void> {
    const deck = await this.deckRepo.findOne({ where: { id } });
    if (!deck) throw new NotFoundException('Flashcard deck not found');
    if (deck.owner_id !== userId) throw new ForbiddenException('Not your deck');
    await this.deckRepo.delete(id);
  }
}
