import {
  IsEmail,
  IsString,
  IsOptional,
  IsInt,
  IsIn,
  MinLength,
} from 'class-validator';
import { ROLE_STUDENT } from '../../roles/entities/role.entity';

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
