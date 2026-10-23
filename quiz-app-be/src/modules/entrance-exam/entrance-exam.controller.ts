import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../../core/guards/jwt.guard';
import type { AuthenticatedRequest } from '../../core/decorators/current-user.decorator';
import { EntranceExamService } from './entrance-exam.service';
import { isAiConfigured } from '../../core/ai/anthropic';
import { StartExamDto, SubmitExamDto } from './dto/exam.dto';

@Controller('api/v1/entrance-exam')
export class EntranceExamController {
  constructor(private readonly service: EntranceExamService) {}

  @Get('ai-status')
  aiStatus() {
    const ai_enabled = isAiConfigured();
    return { code: 200, message: 'AI status', data: { ai_enabled } };
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtGuard)
  async generate(@Req() req: AuthenticatedRequest, @Body() dto: StartExamDto) {
    const result = await this.service.generateExam(dto, req.user.id);
    return { code: 200, message: 'Exam generated', data: result };
  }

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtGuard)
  async submit(@Req() req: AuthenticatedRequest, @Body() dto: SubmitExamDto) {
    const result = await this.service.evaluateExam(dto, req.user.id);
    return { code: 200, message: 'Exam evaluated', data: result };
  }

  /** The signed-in student's past sittings (stored in the DB). */
  @Get('history')
  @UseGuards(JwtGuard)
  async history(@Req() req: AuthenticatedRequest) {
    const data = await this.service.getHistory(req.user.id);
    return { code: 200, message: 'Exam history', data };
  }

  /** The stored result of one past sitting. */
  @Get('attempts/:id')
  @UseGuards(JwtGuard)
  async attempt(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const data = await this.service.getAttemptResult(id, req.user.id);
    return { code: 200, message: 'Exam result', data };
  }
}
