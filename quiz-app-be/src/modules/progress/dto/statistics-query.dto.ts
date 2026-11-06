import { IsIn, IsOptional } from 'class-validator';
import { STAT_PERIODS } from '../statistics.service';
import type { StatPeriod } from '../statistics.service';

export class StatisticsQuery {
  @IsOptional()
  @IsIn(STAT_PERIODS)
  period?: StatPeriod;
}
