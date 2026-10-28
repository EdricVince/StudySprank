import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Class } from './entities/class.entity';
import { ClassEnrollment } from './entities/class-enrollment.entity';
import { UserProgress } from '../progress/entities/user-progress.entity';
import { User } from '../users/entities/user.entity';
import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';
import { AnalyticsService } from './analytics.service';
import { ClassHubService } from './class-hub.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Class, ClassEnrollment, UserProgress, User]),
    AuthModule,
  ],
  controllers: [ClassesController],
  providers: [ClassesService, AnalyticsService, ClassHubService],
  exports: [ClassesService],
})
export class ClassesModule {}
