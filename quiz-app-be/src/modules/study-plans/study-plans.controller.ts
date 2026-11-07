import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../../core/guards/jwt.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import type { CurrentUserData } from '../../core/decorators/current-user.decorator';
import { StudyPlansService } from './study-plans.service';
import { SaveStudyPlanDto } from './dto/study-plan.dto';

/** The caller's own AI study plans. */
@Controller('api/v1/study-plans')
@UseGuards(JwtGuard)
export class StudyPlansController {
  constructor(private readonly service: StudyPlansService) {}

  @Get()
  async list(@CurrentUser() user: CurrentUserData) {
    const data = await this.service.list(user.id);
    return { code: 200, message: 'OK', data };
  }

  /** Create or replace the plan with this id. */
  @Put(':id')
  async save(
    @CurrentUser() user: CurrentUserData,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SaveStudyPlanDto,
  ) {
    const data = await this.service.save(user.id, id, dto);
    return { code: 200, message: 'Study plan saved', data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: CurrentUserData,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.service.remove(user.id, id);
  }
}
