import {
  IsEmail,
  IsString,
  IsOptional,
  IsInt,
  IsIn,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ROLE_STUDENT } from '../../roles/entities/role.entity';
import { IMAGE_DATA_URL, MAX_CARD_LEN } from '../../users/teacher-card';
import type { TeacherStatus } from '../../users/entities/user.entity';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  // Self-registration can only create students; teacher/admin roles are rejected (400).
  @IsInt()
  @IsIn([ROLE_STUDENT], { message: 'Only student accounts can self-register' })
  @IsOptional()
  role_id?: number;
}

export class RefreshTokenDto {
  @IsString()
  @MinLength(1)
  refresh_token: string;
}

export class LogoutDto {
  @IsOptional()
  @IsString()
  refresh_token?: string;
}

export class TokenPairDto {
  access_token: string;
  refresh_token: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}

export class UserOutDto {
  id: number;
  email: string;
  is_active: boolean;
  role_id: number;
  teacher_status?: TeacherStatus;
}

export class RegisterResponseDto extends UserOutDto {
  access_token: string;
  refresh_token: string;
}

export class LoginResponseDto {
  access_token: string;
  refresh_token: string;
  user: UserOutDto;
}

export class ProfileDto {
  id: number;
  email: string;
  name: string | null;
  avatar: string | null;
  role_id: number;
  is_active: boolean;
  created_at: Date;
  teacher_status: TeacherStatus;
  teacher_organization: string | null;
  teacher_reject_reason: string | null;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}

/** A teacher applying for an account. It stays 'pending' until an admin approves it. */
export class RegisterTeacherDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  /** School / language centre — shown to the admin who reviews the application. */
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  organization: string;

  /** Photo of a teacher ID card / certificate (base64 data URL). */
  @IsString()
  @MaxLength(MAX_CARD_LEN, {
    message: 'Document image is too large (max ~2.5MB)',
  })
  @Matches(IMAGE_DATA_URL, {
    message: 'Document must be a base64 image data URL',
  })
  teacher_card_image: string;
}

/** Re-submit the verification document after a rejection (or to replace a pending one). */
export class TeacherApplicationDto {
  @IsString()
  @MaxLength(MAX_CARD_LEN, {
    message: 'Document image is too large (max ~2.5MB)',
  })
  @Matches(IMAGE_DATA_URL, {
    message: 'Document must be a base64 image data URL',
  })
  teacher_card_image: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  organization?: string;
}
