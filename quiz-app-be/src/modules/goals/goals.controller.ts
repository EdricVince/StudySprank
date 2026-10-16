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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GoalsService } from './goals.service';
import { JwtGuard } from '../../core/guards/jwt.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import type { CurrentUserData } from '../../core/decorators/current-user.decorator';
import {
  UpdateGoalSettingsDto,
  CreateCustomGoalDto,
  UpdateCustomGoalDto,
} from './dto/goals.dto';

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

@Controller('api/v1/goals')
@UseGuards(JwtGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  async getGoals(
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponse<any>> {
    const data = await this.goalsService.getGoals(user.id);
    return { code: HttpStatus.OK, message: 'Goals fetched', data };
  }

  @Put('settings')
  async updateSettings(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateGoalSettingsDto,
  ): Promise<ApiResponse<any>> {
    const data = await this.goalsService.updateSettings(user.id, dto);
    return { code: HttpStatus.OK, message: 'Settings updated', data };
  }

  @Post('custom')
  async createCustomGoal(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateCustomGoalDto,
  ): Promise<ApiResponse<any>> {
    const data = await this.goalsService.createCustomGoal(user.id, dto);
    return { code: HttpStatus.CREATED, message: 'Goal created', data };
  }

  @Put('custom/:id')
  async updateCustomGoal(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomGoalDto,
  ): Promise<ApiResponse<any>> {
    const data = await this.goalsService.updateCustomGoal(user.id, id, dto);
    return { code: HttpStatus.OK, message: 'Goal updated', data };
  }

  @Delete('custom/:id')
  @HttpCode(HttpStatus.OK)
  async deleteCustomGoal(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponse<any>> {
    await this.goalsService.deleteCustomGoal(user.id, id);
    return { code: HttpStatus.OK, message: 'Goal deleted', data: null };
  }
}
