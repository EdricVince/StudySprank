import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtGuard } from '../../core/guards/jwt.guard';
import type { AuthenticatedRequest } from '../../core/decorators/current-user.decorator';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { ROLE_TEACHER } from '../roles/entities/role.entity';
import {
  LessonsService,
  CreateLessonDto,
  UpdateLessonDto,
} from './lessons.service';

@Controller('api/v1/lessons')
@UseGuards(JwtGuard, RolesGuard)
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post()
  @Roles(ROLE_TEACHER)
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateLessonDto) {
    const lesson = await this.lessonsService.create(
      req.user.id,
      req.user.role_id,
      dto,
    );
    return { code: 201, message: 'Lesson created', data: lesson };
  }

  @Get()
  async findAll(@Req() req: AuthenticatedRequest) {
    const lessons = await this.lessonsService.findForUser(
      req.user.id,
      req.user.role_id,
    );
    return { code: 200, message: 'OK', data: lessons };
  }

  @Get(':id')
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const lesson = await this.lessonsService.findOne(
      id,
      req.user.id,
      req.user.role_id,
    );
    return { code: 200, message: 'OK', data: lesson };
  }

  @Put(':id')
  @Roles(ROLE_TEACHER)
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLessonDto,
  ) {
    const lesson = await this.lessonsService.update(id, req.user.id, dto);
    return { code: 200, message: 'Updated', data: lesson };
  }

  @Delete(':id')
  @Roles(ROLE_TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.lessonsService.remove(id, req.user.id);
  }
}
