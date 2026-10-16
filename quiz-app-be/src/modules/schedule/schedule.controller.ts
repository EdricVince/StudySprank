import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { GenerateScheduleDto, ExtendScheduleDto } from './dto/schedule.dto';
import { JwtGuard } from '../../core/guards/jwt.guard';

@Controller('api/v1/schedule')
@UseGuards(JwtGuard)
export class ScheduleController {
  constructor(private readonly service: ScheduleService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generate(@Body() dto: GenerateScheduleDto) {
    const plan = await this.service.generatePlan(dto);
    return { code: 200, message: 'Study plan generated', data: plan };
  }

  @Post('extend')
  @HttpCode(HttpStatus.OK)
  async extend(@Body() dto: ExtendScheduleDto) {
    const month = await this.service.extendPlan(dto);
    return { code: 200, message: 'Month generated', data: month };
  }
}
