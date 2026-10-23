import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntranceExamController } from './entrance-exam.controller';
import { EntranceExamService } from './entrance-exam.service';
import { ExamPaper } from './entities/exam-paper.entity';
import { ExamQuestionRow } from './entities/exam-question.entity';
import { ExamAttempt } from './entities/exam-attempt.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExamPaper, ExamQuestionRow, ExamAttempt]),
  ],
  controllers: [EntranceExamController],
  providers: [EntranceExamService],
})
export class EntranceExamModule {}
