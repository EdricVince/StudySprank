import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../../core/guards/jwt.guard';
import type { AuthenticatedRequest } from '../../core/decorators/current-user.decorator';
import { SpeakingService } from './speaking.service';
import { EvaluateSpeakingDto } from './dto/skills.dto';
import type { CefrLevel } from './dto/skills.dto';

@Controller('api/v1/skills/speaking')
@UseGuards(JwtGuard)
export class SpeakingController {
  constructor(private readonly speaking: SpeakingService) {}

  @Get('exercise')
  async getExercise(
    @Req() req: AuthenticatedRequest,
    @Query('level') level?: CefrLevel,
  ) {
    const data = await this.speaking.getExercise(level ?? 'B1', req.user.id);
    return { code: 200, message: 'Exercise generated', data };
  }

  @Get('prompt')
  async getSpeakingPrompt(
    @Req() req: AuthenticatedRequest,
    @Query('level') level?: CefrLevel,
  ) {
    const data = await this.speaking.getSpeakingPrompt(
      level ?? 'B1',
      req.user.id,
    );
    return { code: 200, message: 'Prompt generated', data };
  }

  @Post('evaluate')
  async evaluate(@Body() dto: EvaluateSpeakingDto) {
    const data = await this.speaking.evaluate(dto);
    return { code: 200, message: 'Evaluated', data };
  }
}
