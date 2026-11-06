import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearningSession } from './entities/learning-session.entity';
import { LearningSessionWord } from './entities/learning-session-word.entity';
import { LearningSessionsController } from './learning-sessions.controller';
import { LearningSessionsService } from './learning-sessions.service';
import { AuthModule } from '../auth/auth.module';

/** Flashcard and quiz history: what each student studied or played, word by word. */
@Module({
  imports: [
    TypeOrmModule.forFeature([LearningSession, LearningSessionWord]),
    AuthModule,
  ],
  controllers: [LearningSessionsController],
  providers: [LearningSessionsService],
})
export class LearningSessionsModule {}
