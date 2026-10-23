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
import { ReadingService } from './reading.service';
import { GetReadingDto, SubmitReadingDto } from './dto/skills.dto';

@Controller('api/v1/skills/reading')
@UseGuards(JwtGuard)
export class ReadingController {
  constructor(private readonly reading: ReadingService) {}

  @Get('passage')
  async getPassage(
    @Req() req: AuthenticatedRequest,
    @Query() dto: GetReadingDto,
  ) {
    const data = await this.reading.getPassage(dto, req.user.id);
    return { code: 200, message: 'Passage generated', data };
  }

  @Post('submit')
  submit(@Body() dto: SubmitReadingDto) {
    // Score per question (extra answers beyond the question list are ignored).
    const total = dto.questions.length;
    const correct = dto.questions.filter(
      (q, i) => dto.answers[i] === q.correct,
    ).length;
    const ratio = total ? correct / total : 0;
    const data = {
      correct,
      total,
      score: Math.round(ratio * 100),
      passed: ratio >= 0.6,
    };
    return { code: 200, message: 'Submitted', data };
  }
}
