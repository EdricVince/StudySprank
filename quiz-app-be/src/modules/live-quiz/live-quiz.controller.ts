import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LiveQuizService, StepDto } from './live-quiz.service';
import { JwtGuard } from '../../core/guards/jwt.guard';
import type { AuthenticatedRequest } from '../../core/decorators/current-user.decorator';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { ROLE_TEACHER } from '../roles/entities/role.entity';

@Controller('api/v1/live-quiz')
@UseGuards(JwtGuard, RolesGuard)
export class LiveQuizController {
  constructor(private liveQuizService: LiveQuizService) {}

  /** Teacher: create a live lesson session */
  @Post()
  @Roles(ROLE_TEACHER)
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() body: { title: string; class_id?: number; steps?: StepDto[] },
  ) {
    const session = await this.liveQuizService.create(
      req.user.id,
      body.title,
      body.class_id,
      body.steps,
    );
    return { code: 201, message: 'Session created', data: session };
  }

  /** Teacher: list my sessions */
  @Get('my')
  @Roles(ROLE_TEACHER)
  async mysessions(@Req() req: AuthenticatedRequest) {
    const sessions = await this.liveQuizService.findByTeacher(req.user.id);
    return { code: 200, message: 'OK', data: sessions };
  }

  /** Student: join by PIN */
  @Get('join/:pin')
  async joinByPin(@Param('pin') pin: string) {
    const session = await this.liveQuizService.findByPin(pin);
    const steps = this.liveQuizService.parseSteps(session);
    return {
      code: 200,
      message: 'OK',
      data: { ...session, steps, total_steps: steps.length },
    };
  }

  /** Get session state */
  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number) {
    const session = await this.liveQuizService.findOne(id);
    const steps = this.liveQuizService.parseSteps(session);
    return {
      code: 200,
      message: 'OK',
      data: { ...session, steps, total_steps: steps.length },
    };
  }

  /** Teacher: start / end session */
  @Patch(':id/status')
  @Roles(ROLE_TEACHER)
  async updateStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string },
  ) {
    const session = await this.liveQuizService.updateStatus(
      id,
      req.user.id,
      body.status,
    );
    return { code: 200, message: 'Updated', data: session };
  }

  /** Teacher: delete session */
  @Delete(':id')
  @Roles(ROLE_TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.liveQuizService.delete(id, req.user.id);
  }
}
