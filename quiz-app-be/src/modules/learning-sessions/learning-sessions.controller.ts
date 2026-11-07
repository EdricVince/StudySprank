import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../../core/guards/jwt.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import type { CurrentUserData } from '../../core/decorators/current-user.decorator';
import { LearningSessionsService } from './learning-sessions.service';
import {
  CreateLearningSessionDto,
  ListLearningSessionsQuery,
  VocabularyQuery,
} from './dto/learning-session.dto';

/** The signed-in user's flashcard and quiz history. Every route is scoped to the caller. */
@Controller('api/v1/learning-sessions')
@UseGuards(JwtGuard)
export class LearningSessionsController {
  constructor(private readonly service: LearningSessionsService) {}

  @Post()
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateLearningSessionDto,
  ) {
    const data = await this.service.create(user.id, dto);
    return { code: 201, message: 'Learning session saved', data };
  }

  @Get()
  async list(
    @CurrentUser() user: CurrentUserData,
    @Query() query: ListLearningSessionsQuery,
  ) {
    const data = await this.service.list(user.id, query);
    return { code: 200, message: 'OK', data };
  }

  /** Every word the caller has practised, with how it went (declared before ':id'). */
  @Get('vocabulary')
  async vocabulary(
    @CurrentUser() user: CurrentUserData,
    @Query() query: VocabularyQuery,
  ) {
    const data = await this.service.vocabulary(user.id, query);
    return { code: 200, message: 'OK', data };
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const data = await this.service.findOne(user.id, id);
    return { code: 200, message: 'OK', data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.service.remove(user.id, id);
  }
}
