import { Module } from '@nestjs/common';
import { ReadingController } from './reading.controller';
import { ListeningController } from './listening.controller';
import { WritingController } from './writing.controller';
import { SpeakingController } from './speaking.controller';
import { ReadingService } from './reading.service';
import { ListeningService } from './listening.service';
import { WritingService } from './writing.service';
import { SpeakingService } from './speaking.service';

@Module({
  controllers: [
    ReadingController,
    ListeningController,
    WritingController,
    SpeakingController,
  ],
  providers: [
    ReadingService,
    ListeningService,
    WritingService,
    SpeakingService,
  ],
})
export class SkillsModule {}
