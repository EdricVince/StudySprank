import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { UserProgress } from './entities/user-progress.entity';
import { DailyActivity } from './entities/daily-activity.entity';
import { LessonCompletion } from './entities/lesson-completion.entity';
import { User } from '../users/entities/user.entity';
import { JwtGuard } from '../../core/guards/jwt.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserProgress,
      DailyActivity,
      LessonCompletion,
      User,
    ]),
  ],
  controllers: [ProgressController],
  providers: [ProgressService, JwtGuard],
  exports: [ProgressService],
})
export class ProgressModule {}
