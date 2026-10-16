import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';
import { UserGoalSettings } from './entities/user-goal-settings.entity';
import { UserCustomGoal } from './entities/user-custom-goal.entity';
import { UserProgress } from '../progress/entities/user-progress.entity';
import { DailyActivity } from '../progress/entities/daily-activity.entity';
import { JwtGuard } from '../../core/guards/jwt.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserGoalSettings,
      UserCustomGoal,
      UserProgress,
      DailyActivity,
    ]),
  ],
  controllers: [GoalsController],
  providers: [GoalsService, JwtGuard],
})
export class GoalsModule {}
