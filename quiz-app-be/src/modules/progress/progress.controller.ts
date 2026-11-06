import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProgressService } from './progress.service';
import { StatisticsService } from './statistics.service';
import { StatisticsQuery } from './dto/statistics-query.dto';
import { JwtGuard } from '../../core/guards/jwt.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import type { CurrentUserData } from '../../core/decorators/current-user.decorator';
import { LogActivityDto } from './dto/log-activity.dto';

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

@Controller('api/v1/progress')
@UseGuards(JwtGuard)
export class ProgressController {
  constructor(
    private readonly progressService: ProgressService,
    private readonly statisticsService: StatisticsService,
  ) {}

  /** The signed-in student's own learning statistics (week / month / year). */
  @Get('statistics')
  async getMyStatistics(
    @CurrentUser() user: CurrentUserData,
    @Query() query: StatisticsQuery,
  ): Promise<ApiResponse<any>> {
    const data = await this.statisticsService.getMyStatistics(
      user.id,
      query.period ?? 'week',
    );
    return { code: HttpStatus.OK, message: 'Statistics fetched', data };
  }

  @Get('me')
  async getMyStats(
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponse<any>> {
    const data = await this.progressService.getMyStats(user.id);
    return { code: HttpStatus.OK, message: 'Progress fetched', data };
  }

  @Post('activity')
  @HttpCode(HttpStatus.OK)
  async logActivity(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: LogActivityDto,
  ): Promise<ApiResponse<any>> {
    const data = await this.progressService.logActivity(user.id, dto);
    return { code: HttpStatus.OK, message: 'Activity logged', data };
  }

  @Post('challenges/:id/claim')
  @HttpCode(HttpStatus.OK)
  async claimChallenge(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponse<any>> {
    const data = await this.progressService.claimChallenge(user.id, id);
    return { code: HttpStatus.OK, message: 'Challenge reward claimed', data };
  }

  @Get('weekly')
  async getWeeklyActivity(
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponse<any>> {
    const data = await this.progressService.getWeeklyActivity(user.id);
    return { code: HttpStatus.OK, message: 'Weekly activity fetched', data };
  }

  @Get('leaderboard')
  async getLeaderboard(): Promise<ApiResponse<any>> {
    const data = await this.progressService.getLeaderboard();
    return { code: HttpStatus.OK, message: 'Leaderboard fetched', data };
  }

  @Get('lessons/completed')
  async getCompletedLessons(
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponse<number[]>> {
    const data = await this.progressService.getCompletedLessonIds(user.id);
    return { code: HttpStatus.OK, message: 'Completed lessons fetched', data };
  }

  @Post('lessons/:id/complete')
  @HttpCode(HttpStatus.OK)
  async completeLesson(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponse<{ completed: true }>> {
    const data = await this.progressService.completeLesson(user.id, id);
    return { code: HttpStatus.OK, message: 'Lesson completed', data };
  }
}
