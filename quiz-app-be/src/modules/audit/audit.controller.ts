import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { JwtGuard } from '../../core/guards/jwt.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../core/decorators/current-user.decorator';
import { ROLE_ADMIN } from '../roles/entities/role.entity';
import { ActivityLogService } from './activity-log.service';

class ActivityQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  actor_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  class_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  action?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  before_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

@Controller('api/v1')
@UseGuards(JwtGuard, RolesGuard)
export class AuditController {
  constructor(private readonly activity: ActivityLogService) {}

  /** The whole platform's activity trail (admins only). */
  @Get('admin/activity')
  @Roles(ROLE_ADMIN)
  async list(@Query() query: ActivityQueryDto) {
    const data = await this.activity.list(query);
    return { code: 200, message: 'Activity retrieved', data };
  }

  /** The signed-in user's own recent actions (teacher dashboard feed). */
  @Get('activity/mine')
  async mine(@Req() req: AuthenticatedRequest) {
    const data = await this.activity.list({ actor_id: req.user.id, limit: 20 });
    return { code: 200, message: 'Activity retrieved', data };
  }
}
