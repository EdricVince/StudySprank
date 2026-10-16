import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FlashcardDeck, DeckCard } from './entities/flashcard-deck.entity';
import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class CreateFlashcardDeckDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsBoolean() is_public?: boolean;
  @IsOptional() @IsArray() cards?: DeckCard[];
}

export class UpdateFlashcardDeckDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsBoolean() is_public?: boolean;
  @IsOptional() @IsArray() cards?: DeckCard[];
}

@Injectable()
export class FlashcardDecksService {
  constructor(
    @InjectRepository(FlashcardDeck)
    private deckRepo: Repository<FlashcardDeck>,
  ) {}

  async create(
    ownerId: number,
    dto: CreateFlashcardDeckDto,
  ): Promise<FlashcardDeck> {
    const deck = this.deckRepo.create({
      owner_id: ownerId,
      title: dto.title,
      description: dto.description ?? null,
      category: dto.category ?? 'General',
      cards: dto.cards ?? [],
      is_public: dto.is_public ?? true,
    });
    return this.deckRepo.save(deck);
  }

  /**
   * The user's own decks (public or private) plus every other user's PUBLIC decks.
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
      .where('d.owner_id = :userId OR d.is_public = true', { userId })
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
    if (!deck.is_public && deck.owner_id !== userId) {
      throw new ForbiddenException('This deck is private');
    }
    return deck;
  }

  async update(
    id: number,
    userId: number,
    dto: UpdateFlashcardDeckDto,
  ): Promise<FlashcardDeck> {
    const deck = await this.deckRepo.findOne({ where: { id } });
    if (!deck) throw new NotFoundException('Flashcard deck not found');
    if (deck.owner_id !== userId) throw new ForbiddenException('Not your deck');
    Object.assign(deck, dto);
    return this.deckRepo.save(deck);
  }

  async remove(id: number, userId: number): Promise<void> {
    const deck = await this.deckRepo.findOne({ where: { id } });
    if (!deck) throw new NotFoundException('Flashcard deck not found');
    if (deck.owner_id !== userId) throw new ForbiddenException('Not your deck');
    await this.deckRepo.delete(id);
  }
}
