import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../../core/guards/jwt.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import type { CurrentUserData } from '../../core/decorators/current-user.decorator';
import { RateLimit } from '../../core/decorators/rate-limit.decorator';
import { AccountService } from './account.service';
import {
  ChangePasswordDto,
  DeleteAccountDto,
  UpdateAccountProfileDto,
} from './dto/account.dto';

// Same per-IP limit as the sign-in endpoints: these also check the current password.
const MIN = 60_000;
const AUTH_LIMIT_ENV = 'THROTTLE_AUTH_LIMIT';

/** The signed-in user's own profile, settings, password, data export and account deletion. */
@Controller('api/v1/account')
@UseGuards(JwtGuard)
export class AccountController {
  constructor(private readonly service: AccountService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: CurrentUserData) {
    const data = await this.service.getProfile(user.id);
    return { code: 200, message: 'OK', data };
  }

  @Put('profile')
  async updateProfile(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateAccountProfileDto,
  ) {
    const data = await this.service.updateProfile(user.id, dto);
    return { code: 200, message: 'Profile saved', data };
  }

  /** Returns a new token pair: every other device is signed out, this one stays signed in. */
  @Put('password')
  @RateLimit({ limit: 10, windowMs: 10 * MIN, limitEnv: AUTH_LIMIT_ENV })
  async changePassword(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: ChangePasswordDto,
  ) {
    const data = await this.service.changePassword(
      user.id,
      dto.current_password,
      dto.new_password,
    );
    return { code: 200, message: 'Password changed', data };
  }

  @Get('export')
  async exportData(@CurrentUser() user: CurrentUserData) {
    const data = await this.service.exportData(user.id);
    return { code: 200, message: 'OK', data };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 5, windowMs: 10 * MIN, limitEnv: AUTH_LIMIT_ENV })
  async deleteAccount(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: DeleteAccountDto,
  ) {
    await this.service.deleteAccount(user.id, dto.password);
    return { code: 200, message: 'Account deleted', data: null };
  }
}
