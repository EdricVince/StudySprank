import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudyPlan } from './entities/study-plan.entity';
import { StudyPlansController } from './study-plans.controller';
import { StudyPlansService } from './study-plans.service';
import { AuthModule } from '../auth/auth.module';

/** The AI study planner's saved plans, kept per student in the database. */
@Module({
  imports: [TypeOrmModule.forFeature([StudyPlan]), AuthModule],
  controllers: [StudyPlansController],
  providers: [StudyPlansService],
})
export class StudyPlansModule {}
