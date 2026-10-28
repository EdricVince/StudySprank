import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ClassesService,
  CreateClassDto,
  UpdateClassDto,
} from './classes.service';
import { AnalyticsService } from './analytics.service';
import { ClassHubService } from './class-hub.service';
import { ActivityLogService } from '../audit/activity-log.service';
import { JwtGuard } from '../../core/guards/jwt.guard';
import type { AuthenticatedRequest } from '../../core/decorators/current-user.decorator';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { ROLE_TEACHER } from '../roles/entities/role.entity';

@Controller('api/v1/classes')
@UseGuards(JwtGuard, RolesGuard)
export class ClassesController {
  constructor(
    private classesService: ClassesService,
    private analyticsService: AnalyticsService,
    private hubService: ClassHubService,
    private activityLog: ActivityLogService,
  ) {}

  /** GET /classes/analytics — teacher analytics dashboard */
  @Get('analytics')
  @Roles(ROLE_TEACHER)
  async getAnalytics(@Req() req: AuthenticatedRequest) {
    const data = await this.analyticsService.getTeacherAnalytics(req.user.id);
    return { code: 200, message: 'OK', data };
  }

  /** GET /classes — teacher: own classes; student: enrolled classes */
  @Get()
  async findAll(@Req() req: AuthenticatedRequest) {
    const classes = await this.classesService.findAll(
      req.user.id,
      req.user.role_id,
    );
    return { code: 200, message: 'OK', data: classes };
  }

  /** POST /classes — teacher creates a class */
  @Post()
  @Roles(ROLE_TEACHER)
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateClassDto) {
    const cls = await this.classesService.create(req.user.id, dto);
    return { code: 201, message: 'Class created', data: cls };
  }

  /** POST /classes/join — student joins by class code */
  @Post('join')
  async join(
    @Req() req: AuthenticatedRequest,
    @Body() body: { class_code: string },
  ) {
    const cls = await this.classesService.joinClass(
      body.class_code,
      req.user.id,
    );
    return { code: 200, message: 'Joined class', data: cls };
  }

  /** DELETE /classes/:id/leave — a student leaves the class */
  @Delete(':id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leave(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.classesService.leaveClass(id, req.user.id);
  }

  /** GET /classes/:id/hub — a class and all of its content (teacher: + roster with progress) */
  @Get(':id/hub')
  async hub(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const data = await this.hubService.getHub(id, req.user);
    return { code: 200, message: 'OK', data };
  }

  /** GET /classes/:id/activity — who did what in this class (its teacher) */
  @Get(':id/activity')
  @Roles(ROLE_TEACHER)
  async activity(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    // Throws unless this teacher owns the class.
    await this.classesService.findOneForUser(id, req.user.id, req.user.role_id);
    const data = await this.activityLog.list({ class_id: id, limit: 30 });
    return { code: 200, message: 'OK', data };
  }

  /** GET /classes/:id — teacher: own class; student: enrolled class; admin: any */
  @Get(':id')
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const cls = await this.classesService.findOneForUser(
      id,
      req.user.id,
      req.user.role_id,
    );
    return { code: 200, message: 'OK', data: cls };
  }

  /** PUT /classes/:id — teacher updates class */
  @Put(':id')
  @Roles(ROLE_TEACHER)
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClassDto,
  ) {
    const cls = await this.classesService.update(id, req.user.id, dto);
    return { code: 200, message: 'Updated', data: cls };
  }

  /** DELETE /classes/:id — teacher deletes class */
  @Delete(':id')
  @Roles(ROLE_TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.classesService.delete(id, req.user.id);
  }

  /** GET /classes/:id/students */
  @Get(':id/students')
  @Roles(ROLE_TEACHER)
  async getStudents(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const students = await this.classesService.getStudents(id, req.user.id);
    return { code: 200, message: 'OK', data: students };
  }

  /** DELETE /classes/:id/students/:studentId */
  @Delete(':id/students/:studentId')
  @Roles(ROLE_TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeStudent(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ) {
    await this.classesService.removeStudent(id, studentId, req.user.id);
  }
}
