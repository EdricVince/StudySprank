import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RateLimitGuard } from './core/guards/rate-limit.guard';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoreModule } from './core/core.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClassesModule } from './modules/classes/classes.module';
import { ProgressModule } from './modules/progress/progress.module';
import { GoalsModule } from './modules/goals/goals.module';
import { AdminModule } from './modules/admin/admin.module';
import { AiModule } from './modules/ai/ai.module';
import { VideosModule } from './modules/videos/videos.module';
import { LiveQuizModule } from './modules/live-quiz/live-quiz.module';
import { EntranceExamModule } from './modules/entrance-exam/entrance-exam.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { SkillsModule } from './modules/skills/skills.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { VocabSetsModule } from './modules/vocab-sets/vocab-sets.module';
import { FlashcardDecksModule } from './modules/flashcard-decks/flashcard-decks.module';
import { TestsModule } from './modules/tests/tests.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { BattleModule } from './modules/battle/battle.module';

@Module({
  imports: [
    CoreModule,
    AuthModule,
    ClassesModule,
    ProgressModule,
    GoalsModule,
    AdminModule,
    AiModule,
    VideosModule,
    LiveQuizModule,
    EntranceExamModule,
    ScheduleModule,
    SkillsModule,
    LessonsModule,
    VocabSetsModule,
    FlashcardDecksModule,
    TestsModule,
    AssignmentsModule,
    BattleModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: RateLimitGuard }],
})
export class AppModule {}
