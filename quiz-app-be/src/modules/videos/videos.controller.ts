import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VideosService, CreateVideoDto } from './videos.service';
import { JwtGuard } from '../../core/guards/jwt.guard';
import type { AuthenticatedRequest } from '../../core/decorators/current-user.decorator';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { ROLE_TEACHER } from '../roles/entities/role.entity';

@Controller('api/v1/videos')
@UseGuards(JwtGuard, RolesGuard)
export class VideosController {
  constructor(private videosService: VideosService) {}

  /** Teacher: create video */
  @Post()
  @Roles(ROLE_TEACHER)
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateVideoDto) {
    const video = await this.videosService.create(req.user.id, dto);
    return { code: 201, message: 'Video created', data: video };
  }

  /** All: list videos scoped to the requester (teacher own / student enrolled / admin any) */
  @Get()
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query('class_id') classId?: string,
  ) {
    const videos = await this.videosService.findForUser(
      req.user.id,
      req.user.role_id,
      classId ? Number(classId) : undefined,
    );
    return { code: 200, message: 'OK', data: videos };
  }

  /** All: get one video (teacher own / student enrolled / admin any) */
  @Get(':id')
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const video = await this.videosService.findOneForUser(
      id,
      req.user.id,
      req.user.role_id,
    );
    return { code: 200, message: 'OK', data: video };
  }

  /** Teacher: update video */
  @Patch(':id')
  @Roles(ROLE_TEACHER)
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateVideoDto>,
  ) {
    const video = await this.videosService.update(id, req.user.id, dto);
    return { code: 200, message: 'Updated', data: video };
  }

  /** Teacher: delete video */
  @Delete(':id')
  @Roles(ROLE_TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.videosService.remove(id, req.user.id);
  }
}
