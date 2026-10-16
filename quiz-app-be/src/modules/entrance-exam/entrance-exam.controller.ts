import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../../core/guards/jwt.guard';
import { EntranceExamService } from './entrance-exam.service';
import { StartExamDto, SubmitExamDto } from './dto/exam.dto';

@Controller('api/v1/entrance-exam')
export class EntranceExamController {
  constructor(private readonly service: EntranceExamService) {}

  @Get('ai-status')
  aiStatus() {
    const key = process.env.ANTHROPIC_API_KEY ?? '';
    const ai_enabled = !!key && key.startsWith('sk-ant-');
    return { code: 200, message: 'AI status', data: { ai_enabled } };
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtGuard)
  async generate(@Body() dto: StartExamDto) {
    const result = await this.service.generateExam(dto);
    return { code: 200, message: 'Exam generated', data: result };
  }

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtGuard)
  async submit(@Body() dto: SubmitExamDto) {
    const result = await this.service.evaluateExam(dto);
    return { code: 200, message: 'Exam evaluated', data: result };
  }
}
