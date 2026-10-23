import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReadingController } from './reading.controller';
import { ListeningController } from './listening.controller';
import { WritingController } from './writing.controller';
import { SpeakingController } from './speaking.controller';
import { ReadingService } from './reading.service';
import { ListeningService } from './listening.service';
import { WritingService } from './writing.service';
import { SpeakingService } from './speaking.service';
import { SkillMaterialsService } from './skill-materials.service';
import { SkillMaterial } from './entities/skill-material.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SkillMaterial])],
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
    SkillMaterialsService,
  ],
})
export class SkillsModule {}
