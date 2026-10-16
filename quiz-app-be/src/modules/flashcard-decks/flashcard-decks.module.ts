import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlashcardDeck } from './entities/flashcard-deck.entity';
import { CardReview } from './entities/card-review.entity';
import { FlashcardDecksController } from './flashcard-decks.controller';
import { FlashcardDecksService } from './flashcard-decks.service';
import { CardReviewsService } from './card-reviews.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([FlashcardDeck, CardReview]), AuthModule],
  controllers: [FlashcardDecksController],
  providers: [FlashcardDecksService, CardReviewsService],
})
export class FlashcardDecksModule {}
