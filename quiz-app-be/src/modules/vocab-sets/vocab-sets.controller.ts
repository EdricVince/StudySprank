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
  VocabSetsService,
  CreateVocabSetDto,
  UpdateVocabSetDto,
} from './vocab-sets.service';

@Controller('api/v1/vocab-sets')
@UseGuards(JwtGuard, RolesGuard)
export class VocabSetsController {
  constructor(private readonly vocabSetsService: VocabSetsService) {}

  @Post()
  @Roles(ROLE_TEACHER)
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateVocabSetDto,
  ) {
    const set = await this.vocabSetsService.create(
      req.user.id,
      req.user.role_id,
      dto,
    );
    return { code: 201, message: 'Vocabulary set created', data: set };
  }

  @Get()
  async findAll(@Req() req: AuthenticatedRequest) {
    const sets = await this.vocabSetsService.findForUser(
      req.user.id,
      req.user.role_id,
    );
    return { code: 200, message: 'OK', data: sets };
  }

  @Get(':id')
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const set = await this.vocabSetsService.findOne(
      id,
      req.user.id,
      req.user.role_id,
    );
    return { code: 200, message: 'OK', data: set };
  }

  @Put(':id')
  @Roles(ROLE_TEACHER)
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVocabSetDto,
  ) {
    const set = await this.vocabSetsService.update(id, req.user.id, dto);
    return { code: 200, message: 'Updated', data: set };
  }

  @Delete(':id')
  @Roles(ROLE_TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.vocabSetsService.remove(id, req.user.id);
  }
}
