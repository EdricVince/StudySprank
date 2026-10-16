import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from './entities/assignment.entity';
import { ClassEnrollment } from '../classes/entities/class-enrollment.entity';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Assignment, ClassEnrollment]),
    AuthModule,
  ],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
})
export class AssignmentsModule {}
