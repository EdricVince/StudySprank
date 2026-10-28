import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  HttpException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  RegisterTeacherDto,
  TeacherApplicationDto,
  LoginDto,
  RegisterResponseDto,
  LoginResponseDto,
  ProfileDto,
  UpdateProfileDto,
  RefreshTokenDto,
  LogoutDto,
  TokenPairDto,
} from './dto/register.dto';
import { JwtGuard } from '../../core/guards/jwt.guard';
import { RateLimit } from '../../core/decorators/rate-limit.decorator';

// Stricter per-IP limits on credential endpoints (global default: 120/min).
const MIN = 60_000;
const AUTH_LIMIT_ENV = 'THROTTLE_AUTH_LIMIT';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import type { CurrentUserData } from '../../core/decorators/current-user.decorator';

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @RateLimit({ limit: 10, windowMs: 10 * MIN, limitEnv: AUTH_LIMIT_ENV })
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<ApiResponse<RegisterResponseDto>> {
    const user = await this.authService.register(registerDto);
    return {
      code: HttpStatus.CREATED,
      message: 'User registered successfully',
      data: user,
    };
  }

  /** A teacher applies for an account; an admin reviews it (status 'pending' → 'approved'). */
  @Post('register-teacher')
  @HttpCode(HttpStatus.CREATED)
  @RateLimit({ limit: 5, windowMs: 10 * MIN, limitEnv: AUTH_LIMIT_ENV })
  async registerTeacher(
    @Body() dto: RegisterTeacherDto,
  ): Promise<ApiResponse<RegisterResponseDto>> {
    const user = await this.authService.registerTeacher(dto);
    return {
      code: HttpStatus.CREATED,
      message: 'Application received. An administrator will review it.',
      data: user,
    };
  }

  /** A pending/rejected teacher re-submits the verification document. */
  @Put('teacher/application')
  @UseGuards(JwtGuard)
  @RateLimit({ limit: 10, windowMs: 10 * MIN, limitEnv: AUTH_LIMIT_ENV })
  async submitTeacherApplication(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: TeacherApplicationDto,
  ): Promise<ApiResponse<ProfileDto>> {
    const profile = await this.authService.submitTeacherApplication(
      user.id,
      dto,
    );
    return {
      code: HttpStatus.OK,
      message: 'Application submitted for review',
      data: profile,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 10, windowMs: MIN, limitEnv: AUTH_LIMIT_ENV })
  async login(
    @Body() loginDto: LoginDto,
  ): Promise<ApiResponse<LoginResponseDto>> {
    const result = await this.authService.login(loginDto);
    return {
      code: HttpStatus.OK,
      message: 'Login successful',
      data: result,
    };
  }

  @Get('me')
  @UseGuards(JwtGuard)
  async getMe(
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponse<ProfileDto>> {
    const profile = await this.authService.getMe(user.id);
    return {
      code: HttpStatus.OK,
      message: 'Profile retrieved successfully',
      data: profile,
    };
  }

  @Put('me')
  @UseGuards(JwtGuard)
  async updateMe(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateProfileDto,
  ): Promise<ApiResponse<ProfileDto>> {
    const profile = await this.authService.updateMe(user.id, dto);
    return {
      code: HttpStatus.OK,
      message: 'Profile updated successfully',
      data: profile,
    };
  }

  /** Exchange a refresh token for a new token pair (rotation). Access tokens are not accepted. */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 30, windowMs: MIN, limitEnv: AUTH_LIMIT_ENV })
  async refresh(
    @Body() body: RefreshTokenDto,
  ): Promise<ApiResponse<TokenPairDto>> {
    const result = await this.authService.refresh(body.refresh_token);
    return { code: HttpStatus.OK, message: 'Token refreshed', data: result };
  }

  @Post('oauth-login')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 10, windowMs: MIN, limitEnv: AUTH_LIMIT_ENV })
  async oauthLogin(
    @Body() body: { supabase_token: string },
  ): Promise<ApiResponse<LoginResponseDto>> {
    if (!body?.supabase_token) {
      throw new HttpException(
        'supabase_token is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    const result = await this.authService.oauthLogin(body.supabase_token);
    return {
      code: HttpStatus.OK,
      message: 'OAuth login successful',
      data: result,
    };
  }

  /** Revoke the given refresh token (and its rotation family). */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() body: LogoutDto): Promise<ApiResponse<null>> {
    await this.authService.logout(body?.refresh_token);
    return {
      code: HttpStatus.OK,
      message: 'Logged out successfully',
      data: null,
    };
  }

  // "Forgot password" — sends the reset email.
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 5, windowMs: 15 * MIN, limitEnv: AUTH_LIMIT_ENV })
  async resetPassword(
    @Body() body: { email: string },
  ): Promise<ApiResponse<null>> {
    if (!body?.email)
      throw new HttpException('Email is required', HttpStatus.BAD_REQUEST);
    await this.authService.requestPasswordReset(
      body.email.trim().toLowerCase(),
    );
    // Always the same response so we never reveal whether an account exists.
    return {
      code: HttpStatus.OK,
      message:
        'If an account exists for that email, a reset link has been sent.',
      data: null,
    };
  }

  @Post('reset-password/confirm')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 10, windowMs: 15 * MIN, limitEnv: AUTH_LIMIT_ENV })
  async confirmResetPassword(
    @Body() body: { token: string; new_password: string },
  ): Promise<ApiResponse<null>> {
    if (!body?.token || !body?.new_password) {
      throw new HttpException(
        'Token and new password are required',
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.authService.resetPasswordWithToken(
      body.token,
      body.new_password,
    );
    return {
      code: HttpStatus.OK,
      message: 'Password reset successfully. You can now sign in.',
      data: null,
    };
  }
}
