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
  AssignmentsService,
  CreateAssignmentDto,
  UpdateAssignmentDto,
} from './assignments.service';

@Controller('api/v1/assignments')
@UseGuards(JwtGuard, RolesGuard)
export class AssignmentsController {
  constructor(private readonly service: AssignmentsService) {}

  @Post()
  @Roles(ROLE_TEACHER)
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateAssignmentDto,
  ) {
    const a = await this.service.create(req.user.id, req.user.role_id, dto);
    return { code: 201, message: 'Assignment created', data: a };
  }

  @Get()
  async findAll(@Req() req: AuthenticatedRequest) {
    const data = await this.service.findForUser(req.user.id, req.user.role_id);
    return { code: 200, message: 'OK', data };
  }

  @Get(':id')
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const a = await this.service.findOne(id, req.user.id, req.user.role_id);
    return { code: 200, message: 'OK', data: a };
  }

  @Put(':id')
  @Roles(ROLE_TEACHER)
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAssignmentDto,
  ) {
    const a = await this.service.update(id, req.user.id, dto);
    return { code: 200, message: 'Updated', data: a };
  }

  @Delete(':id')
  @Roles(ROLE_TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.service.remove(id, req.user.id);
  }
}
