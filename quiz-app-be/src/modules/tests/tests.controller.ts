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
  TestsService,
  CreateTestDto,
  UpdateTestDto,
  SubmitTestDto,
} from './tests.service';

@Controller('api/v1/tests')
@UseGuards(JwtGuard, RolesGuard)
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @Post()
  @Roles(ROLE_TEACHER)
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateTestDto) {
    const test = await this.testsService.create(
      req.user.id,
      req.user.role_id,
      dto,
    );
    return { code: 201, message: 'Test created', data: test };
  }

  @Get()
  async findAll(@Req() req: AuthenticatedRequest) {
    const tests = await this.testsService.findForUser(
      req.user.id,
      req.user.role_id,
    );
    return { code: 200, message: 'OK', data: tests };
  }

  @Get(':id')
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const test = await this.testsService.findOne(
      id,
      req.user.id,
      req.user.role_id,
    );
    return { code: 200, message: 'OK', data: test };
  }

  @Put(':id')
  @Roles(ROLE_TEACHER)
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTestDto,
  ) {
    const test = await this.testsService.update(id, req.user.id, dto);
    return { code: 200, message: 'Updated', data: test };
  }

  @Delete(':id')
  @Roles(ROLE_TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.testsService.remove(id, req.user.id);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  async submit(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitTestDto,
  ) {
    const data = await this.testsService.submit(id, req.user.id, dto.answers);
    return { code: 200, message: 'Submitted', data };
  }

  @Get(':id/submissions')
  @Roles(ROLE_TEACHER)
  async submissions(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const data = await this.testsService.getSubmissions(id, req.user.id);
    return { code: 200, message: 'OK', data };
  }
}
