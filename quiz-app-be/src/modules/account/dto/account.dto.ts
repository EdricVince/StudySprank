import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const HTTP_URL = /^https?:\/\/\S+$/i;
export const MAX_SOCIAL_LINKS = 10;

export class SocialLinkDto {
  @IsString() @MinLength(1) @MaxLength(40) platform: string;

  // Only http(s) links: they are shown as clickable links, so "javascript:…" must never get in.
  @IsString()
  @MaxLength(300)
  @Matches(HTTP_URL, { message: 'url must start with http:// or https://' })
  url: string;
}

export class StudyPrefsDto {
  @IsOptional() @IsInt() @Min(1) @Max(500) cardsPerDay?: number;
  @IsOptional() @IsInt() @Min(5) @Max(480) studyMinutes?: number;
}

export class NotificationPrefsDto {
  @IsOptional() @IsBoolean() email?: boolean;
  @IsOptional() @IsBoolean() streakReminder?: boolean;
  @IsOptional() @IsBoolean() achievements?: boolean;
  @IsOptional() @IsBoolean() weeklyReport?: boolean;
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'reminderTime must be HH:MM',
  })
  reminderTime?: string;
  @IsOptional() @IsString() @MaxLength(64) timezone?: string;
}

export class PrivacyPrefsDto {
  @IsOptional() @IsBoolean() publicProfile?: boolean;
  @IsOptional() @IsBoolean() showStreak?: boolean;
  @IsOptional() @IsBoolean() showAchievements?: boolean;
  @IsOptional() @IsBoolean() analytics?: boolean;
}

export class PreferencesDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => StudyPrefsDto)
  study?: StudyPrefsDto;
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPrefsDto)
  notifications?: NotificationPrefsDto;
  @IsOptional()
  @ValidateNested()
  @Type(() => PrivacyPrefsDto)
  privacy?: PrivacyPrefsDto;
}

/** Everything is optional: only what is sent is changed. An empty string clears a text field. */
export class UpdateAccountProfileDto {
  @IsOptional() @IsString() @MaxLength(40) username?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() @MaxLength(120) title?: string;
  @IsOptional() @IsString() @MaxLength(120) location?: string;
  @IsOptional() @IsString() @MaxLength(500) bio?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_SOCIAL_LINKS)
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  social_links?: SocialLinkDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PreferencesDto)
  preferences?: PreferencesDto;
}

export class ChangePasswordDto {
  @IsString() @MinLength(1) @MaxLength(128) current_password: string;
  @IsString() @MinLength(8) @MaxLength(72) new_password: string;
}

export class DeleteAccountDto {
  @IsString() @MinLength(1) @MaxLength(128) password: string;
}
