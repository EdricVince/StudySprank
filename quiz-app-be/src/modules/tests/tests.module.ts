import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Test } from './entities/test.entity';
import { TestSubmission } from './entities/test-submission.entity';
import { ClassEnrollment } from '../classes/entities/class-enrollment.entity';
import { User } from '../users/entities/user.entity';
import { TestsController } from './tests.controller';
import { TestsService } from './tests.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Test, TestSubmission, ClassEnrollment, User]),
    AuthModule,
  ],
  controllers: [TestsController],
  providers: [TestsService],
})
export class TestsModule {}
