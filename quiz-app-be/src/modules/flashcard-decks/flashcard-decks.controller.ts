import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtGuard } from '../../core/guards/jwt.guard';
import type { AuthenticatedRequest } from '../../core/decorators/current-user.decorator';
import {
  FlashcardDecksService,
  CreateFlashcardDeckDto,
  UpdateFlashcardDeckDto,
} from './flashcard-decks.service';
import { CardReviewsService, ReviewCardDto } from './card-reviews.service';

// Any authenticated user (student or teacher) can create/own flashcard decks;
// public decks are shared so everyone can study them. Owner-only writes.
@Controller('api/v1/flashcard-decks')
@UseGuards(JwtGuard)
export class FlashcardDecksController {
  constructor(
    private readonly service: FlashcardDecksService,
    private readonly reviews: CardReviewsService,
  ) {}

  /** Spaced repetition: cards due for this user now (+ never-reviewed cards). */
  @Get(':id/due')
  async due(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const data = await this.reviews.getDue(id, req.user.id);
    return { code: 200, message: 'OK', data };
  }

  /** Spaced repetition: record an answer (quality 0–5) and reschedule the card (SM-2). */
  @Post(':id/review')
  @HttpCode(HttpStatus.OK)
  async review(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewCardDto,
  ) {
    const data = await this.reviews.review(id, req.user.id, dto);
    return { code: 200, message: 'Reviewed', data };
  }

  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateFlashcardDeckDto,
  ) {
    const deck = await this.service.create(req.user.id, dto);
    return { code: 201, message: 'Flashcard deck created', data: deck };
  }

  @Get()
  async findAll(@Req() req: AuthenticatedRequest) {
    const decks = await this.service.findForUser(req.user.id);
    return { code: 200, message: 'OK', data: decks };
  }

  @Get(':id')
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const deck = await this.service.findOne(id, req.user.id);
    return { code: 200, message: 'OK', data: deck };
  }

  @Put(':id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFlashcardDeckDto,
  ) {
    const deck = await this.service.update(id, req.user.id, dto);
    return { code: 200, message: 'Updated', data: deck };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.service.remove(id, req.user.id);
  }
}
