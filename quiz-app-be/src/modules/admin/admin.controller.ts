import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from '../../core/guards/admin.guard';
import {
  IsString,
  IsBoolean,
  IsEmail,
  IsOptional,
  MinLength,
  Matches,
  MaxLength,
  IsArray,
  ArrayNotEmpty,
  IsInt,
} from 'class-validator';
import { isAnthropicKey } from '../../core/ai/anthropic';
import { AiKeyService } from './ai-key.service';

// ~3.5M chars of base64 ≈ 2.6 MB image — plenty for an ID-card photo.
const MAX_CARD_LEN = 3_500_000;
const IMAGE_DATA_URL =
  /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;

class CreateTeacherDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_CARD_LEN, {
    message: 'Teacher card image is too large (max ~2.5MB)',
  })
  @Matches(IMAGE_DATA_URL, {
    message: 'Teacher card must be a base64 image data URL',
  })
  teacher_card_image?: string;
}

class TeacherCardDto {
  @IsString()
  @MaxLength(MAX_CARD_LEN, {
    message: 'Teacher card image is too large (max ~2.5MB)',
  })
  @Matches(IMAGE_DATA_URL, {
    message: 'Teacher card must be a base64 image data URL',
  })
  teacher_card_image: string;
}

class VerifyDto {
  @IsBoolean()
  verified: boolean;
}

class SetActiveDto {
  @IsBoolean()
  is_active: boolean;
}

class ResetPasswordDto {
  @IsString()
  @MinLength(8)
  new_password: string;
}

class BulkDeleteDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  ids: number[];
}

@Controller('api/v1/admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private adminService: AdminService,
    private aiKeys: AiKeyService,
  ) {}

  @Get('stats')
  async getStats() {
    const data = await this.adminService.getStats();
    return { code: 200, message: 'Stats retrieved', data };
  }

  @Get('users')
  async listUsers() {
    const users = await this.adminService.listUsers();
    return { code: 200, message: 'Users retrieved', data: users };
  }

  @Post('create-teacher')
  @HttpCode(HttpStatus.CREATED)
  async createTeacher(@Body() dto: CreateTeacherDto) {
    const result = await this.adminService.createTeacher(
      dto.name,
      dto.password,
      dto.email,
      dto.teacher_card_image,
    );
    return {
      code: 201,
      message: `Teacher account created: ${result.email}`,
      data: result,
    };
  }

  @Get('users/:id/profile')
  async getUserProfile(@Param('id', ParseIntPipe) id: number) {
    const data = await this.adminService.getUserProfile(id);
    return { code: 200, message: 'User profile retrieved', data };
  }

  @Post('users/bulk-delete')
  @HttpCode(HttpStatus.OK)
  async bulkDeleteUsers(@Body() dto: BulkDeleteDto) {
    const deleted = await this.adminService.deleteUsers(dto.ids);
    return {
      code: 200,
      message: `${deleted} user(s) deleted`,
      data: { deleted },
    };
  }

  @Get('users/:id/teacher-card')
  async getTeacherCard(@Param('id', ParseIntPipe) id: number) {
    const image = await this.adminService.getTeacherCard(id);
    return {
      code: 200,
      message: 'Teacher card retrieved',
      data: { teacher_card_image: image },
    };
  }

  @Patch('users/:id/teacher-card')
  async setTeacherCard(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TeacherCardDto,
  ) {
    await this.adminService.setTeacherCard(id, dto.teacher_card_image);
    return {
      code: 200,
      message: 'Teacher card uploaded and account verified',
      data: null,
    };
  }

  @Patch('users/:id/verify')
  async setVerified(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VerifyDto,
  ) {
    await this.adminService.setUserVerified(id, dto.verified);
    return {
      code: 200,
      message: `User ${id} ${dto.verified ? 'verified' : 'unverified'}`,
      data: null,
    };
  }

  @Patch('users/:id/active')
  async setActive(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetActiveDto,
  ) {
    await this.adminService.setUserActive(id, dto.is_active);
    return {
      code: 200,
      message: `User ${id} ${dto.is_active ? 'activated' : 'deactivated'}`,
      data: null,
    };
  }

  @Patch('users/:id/reset-password')
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetPasswordDto,
  ) {
    await this.adminService.resetUserPassword(id, dto.new_password);
    return { code: 200, message: 'Password reset successfully', data: null };
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    await this.adminService.deleteUser(id);
    return { code: 200, message: `User ${id} deleted`, data: null };
  }

  // ── AI Configuration ─────────────────────────────────────────────────────────

  @Get('ai/status')
  getAiStatus() {
    const key = process.env.ANTHROPIC_API_KEY ?? '';
    const enabled = isAnthropicKey(key);
    return {
      code: 200,
      message: 'AI status',
      data: {
        enabled,
        provider: 'Anthropic Claude',
        key_preview: enabled ? `sk-ant-...${key.slice(-6)}` : null,
        features: [
          { name: 'Entrance Exam Generation', key: 'entrance_exam' },
          { name: 'Writing Evaluation', key: 'writing' },
          { name: 'Speaking Evaluation', key: 'speaking' },
          { name: 'Reading Exercises', key: 'reading' },
          { name: 'Listening Exercises', key: 'listening' },
          { name: 'AI Study Schedule', key: 'schedule' },
          { name: 'Word of the Day', key: 'word_of_the_day' },
          { name: 'Content Import (AI Scan)', key: 'content_import' },
          { name: 'Battle Mode Questions', key: 'battle' },
          { name: 'Vocabulary Practice', key: 'vocabulary' },
          { name: 'Lesson & Test Generation', key: 'teacher_content' },
        ],
      },
    };
  }

  @Post('ai/key')
  @HttpCode(HttpStatus.OK)
  async setAiKey(@Body() body: { key: string }) {
    const key = (body.key ?? '').trim();
    if (!key) throw new BadRequestException('API key is required');
    if (!isAnthropicKey(key))
      throw new BadRequestException('Invalid Anthropic API key format');

    await this.aiKeys.save(key);
    return {
      code: 200,
      message: 'AI key saved. All AI features are now active.',
      data: { enabled: true },
    };
  }

  @Delete('ai/key')
  @HttpCode(HttpStatus.OK)
  async removeAiKey() {
    await this.aiKeys.remove();
    return {
      code: 200,
      message: 'AI key removed. AI features are now disabled.',
      data: { enabled: false },
    };
  }
}
