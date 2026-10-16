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
import * as fs from 'fs';
import * as path from 'path';

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

class CreateAiFeatureDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @IsString()
  @Matches(/^sk-ant-[A-Za-z0-9\-_]{10,}$/, {
    message: 'Invalid Anthropic API key format',
  })
  key: string;
}

@Controller('api/v1/admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

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
    const enabled = !!key && key.startsWith('sk-ant-');
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
        ],
        custom_features: this.adminService.listAiFeatures(),
      },
    };
  }

  @Get('ai/features')
  listAiFeatures() {
    return {
      code: 200,
      message: 'Custom AI features',
      data: this.adminService.listAiFeatures(),
    };
  }

  @Post('ai/features')
  @HttpCode(HttpStatus.CREATED)
  addAiFeature(@Body() dto: CreateAiFeatureDto) {
    const data = this.adminService.addAiFeature(dto.name, dto.key);
    return {
      code: 201,
      message: `Feature "${data.name}" added and activated`,
      data,
    };
  }

  @Delete('ai/features/:id')
  @HttpCode(HttpStatus.OK)
  removeAiFeature(@Param('id') id: string) {
    this.adminService.removeAiFeature(id);
    return { code: 200, message: 'Feature removed', data: null };
  }

  @Post('ai/key')
  @HttpCode(HttpStatus.OK)
  setAiKey(@Body() body: { key: string }) {
    const key = (body.key ?? '').trim();
    if (!key) throw new BadRequestException('API key is required');
    // Strict allowlist: only base62 chars and hyphens after the prefix
    if (!/^sk-ant-[A-Za-z0-9\-_]{10,}$/.test(key))
      throw new BadRequestException('Invalid Anthropic API key format');

    process.env.ANTHROPIC_API_KEY = key;

    try {
      const envPath = path.join(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        let content = fs.readFileSync(envPath, 'utf-8');
        // Use a replacement function to prevent $-metachar injection
        if (content.includes('ANTHROPIC_API_KEY=')) {
          content = content.replace(
            /ANTHROPIC_API_KEY=.*/m,
            () => `ANTHROPIC_API_KEY=${key}`,
          );
        } else {
          content += `\nANTHROPIC_API_KEY=${key}`;
        }
        fs.writeFileSync(envPath, content, 'utf-8');
      }
    } catch {
      /* non-fatal — process.env already updated in-memory */
    }

    return {
      code: 200,
      message: 'AI key updated. All AI features are now active.',
      data: { enabled: true },
    };
  }

  @Delete('ai/key')
  @HttpCode(HttpStatus.OK)
  removeAiKey() {
    process.env.ANTHROPIC_API_KEY = '';

    try {
      const envPath = path.join(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        let content = fs.readFileSync(envPath, 'utf-8');
        content = content.replace(
          /ANTHROPIC_API_KEY=.*/m,
          () => 'ANTHROPIC_API_KEY=',
        );
        fs.writeFileSync(envPath, content, 'utf-8');
      }
    } catch {
      /* non-fatal */
    }

    return {
      code: 200,
      message: 'AI key removed. AI features are now disabled.',
      data: { enabled: false },
    };
  }
}
