import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiGeneration } from './entities/ai-generation.entity';
import { AiGenerationService } from './ai-generation.service';
import { AiLogInterceptor } from './ai-log.interceptor';

/** Stores what the AI produced (lessons, tests, evaluations, schedules…) so it lives in the database. */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AiGeneration])],
  providers: [
    AiGenerationService,
    { provide: APP_INTERCEPTOR, useClass: AiLogInterceptor },
  ],
  exports: [AiGenerationService],
})
export class AiLogModule {}
