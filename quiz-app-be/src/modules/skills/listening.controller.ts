import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../core/guards/jwt.guard';
import type { AuthenticatedRequest } from '../../core/decorators/current-user.decorator';
import { ListeningService } from './listening.service';
import { GetListeningDto } from './dto/skills.dto';

@Controller('api/v1/skills/listening')
@UseGuards(JwtGuard)
export class ListeningController {
  constructor(private readonly listening: ListeningService) {}

  @Get('exercise')
  async getExercise(
    @Req() req: AuthenticatedRequest,
    @Query() dto: GetListeningDto,
  ) {
    const data = await this.listening.getExercise(dto, req.user.id);
    return { code: 200, message: 'Exercise generated', data };
  }
}
