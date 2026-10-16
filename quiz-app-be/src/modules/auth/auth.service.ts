import {
  Injectable,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ROLE_STUDENT } from '../roles/entities/role.entity';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { MailService } from '../../core/mail/mail.service';
import { signHs256 } from '../../core/security/jwt.util';
import {
  RegisterDto,
  LoginDto,
  RegisterResponseDto,
  LoginResponseDto,
  ProfileDto,
  UpdateProfileDto,
  TokenPairDto,
} from './dto/register.dto';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import {
  parseDurationSeconds,
  DEFAULT_ACCESS_TTL_SECONDS,
  DEFAULT_REFRESH_TTL_SECONDS,
} from './token-ttl';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const TEACHER_DOMAIN = '@teacher.sprk';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
    private mailService: MailService,
    @InjectRepository(RefreshToken)
    private refreshRepo: Repository<RefreshToken>,
  ) {}

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  private async verifyPassword(
    plain: string,
    hashed: string,
  ): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private get accessTtlSeconds(): number {
    return parseDurationSeconds(
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN'),
      DEFAULT_ACCESS_TTL_SECONDS,
    );
  }

  private get refreshTtlSeconds(): number {
    return parseDurationSeconds(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
      DEFAULT_REFRESH_TTL_SECONDS,
    );
  }

  private generateAccessToken(
    user: Pick<User, 'id' | 'email' | 'role_id'>,
  ): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret)
      throw new InternalServerErrorException('JWT_SECRET not configured');
    return signHs256(
      { sub: user.id, email: user.email, role_id: user.role_id },
      secret,
      this.accessTtlSeconds,
    );
  }

  /** Issue a new opaque refresh token (only its SHA-256 hash is persisted). */
  private async issueRefreshToken(
    userId: number,
    familyId: string = crypto.randomUUID(),
  ): Promise<string> {
    const token = crypto.randomBytes(48).toString('base64url');
    await this.refreshRepo.save(
      this.refreshRepo.create({
        user_id: userId,
        token_hash: this.hashToken(token),
        family_id: familyId,
        expires_at: new Date(Date.now() + this.refreshTtlSeconds * 1000),
        revoked_at: null,
      }),
    );
    return token;
  }

  private async issueTokenPair(
    user: Pick<User, 'id' | 'email' | 'role_id'>,
    familyId?: string,
  ): Promise<TokenPairDto> {
    return {
      access_token: this.generateAccessToken(user),
      refresh_token: await this.issueRefreshToken(user.id, familyId),
    };
  }

  /** Revoke every still-active refresh token of a user (reuse detection / admin actions). */
  async revokeAllForUser(userId: number): Promise<void> {
    await this.refreshRepo.update(
      { user_id: userId, revoked_at: IsNull() },
      { revoked_at: new Date() },
    );
  }

  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    const { email, password } = registerDto;

    // Self-registration always creates a STUDENT. Teachers are created by an
    // admin (POST /admin/create-teacher) and verified there.
    if (email.toLowerCase().endsWith(TEACHER_DOMAIN)) {
      throw new BadRequestException(
        'Teacher accounts are created by an administrator.',
      );
    }

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await this.hashPassword(password);

    let user: User;
    try {
      user = await this.usersService.create(
        email,
        hashedPassword,
        ROLE_STUDENT,
      );
    } catch {
      throw new InternalServerErrorException('Failed to create user');
    }

    return {
      id: user.id,
      email: user.email,
      is_active: user.is_active,
      role_id: user.role_id,
      ...(await this.issueTokenPair(user)),
    };
  }

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await this.verifyPassword(password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Account is not active');
    }

    return {
      ...(await this.issueTokenPair(user)),
      user: {
        id: user.id,
        email: user.email,
        is_active: user.is_active,
        role_id: user.role_id,
      },
    };
  }

  async getMe(userId: number): Promise<ProfileDto> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role_id: user.role_id,
      is_active: user.is_active,
      created_at: user.created_at,
    };
  }

  async updateMe(userId: number, dto: UpdateProfileDto): Promise<ProfileDto> {
    await this.usersService.update(userId, dto);
    return this.getMe(userId);
  }

  /**
   * Rotate a refresh token: the presented token is revoked and a new pair is
   * issued in the same family. Accepts ONLY refresh tokens — an access token
   * (expired or not) is not in the store and is rejected.
   * Presenting an already-revoked token means it leaked: the whole family is revoked.
   */
  async refresh(refreshToken: string): Promise<TokenPairDto> {
    const row = await this.refreshRepo.findOne({
      where: { token_hash: this.hashToken(refreshToken) },
    });
    if (!row) throw new UnauthorizedException('Invalid refresh token');

    if (row.revoked_at) {
      await this.refreshRepo.update(
        { family_id: row.family_id, revoked_at: IsNull() },
        { revoked_at: new Date() },
      );
      throw new UnauthorizedException(
        'Refresh token reuse detected — please sign in again',
      );
    }
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.usersService.findById(row.user_id);
    if (!user || !user.is_active) {
      await this.revokeAllForUser(row.user_id);
      throw new UnauthorizedException('Account is not active');
    }

    row.revoked_at = new Date();
    await this.refreshRepo.save(row);
    return this.issueTokenPair(user, row.family_id);
  }

  /** Revoke the presented refresh token's family (logout on this device). Silent if unknown. */
  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    const row = await this.refreshRepo.findOne({
      where: { token_hash: this.hashToken(refreshToken) },
    });
    if (!row) return;
    await this.refreshRepo.update(
      { family_id: row.family_id, revoked_at: IsNull() },
      { revoked_at: new Date() },
    );
  }

  private async verifySupabaseToken(
    supabaseToken: string,
  ): Promise<{ email: string; name?: string }> {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const serviceKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${supabaseToken}`,
        apikey: serviceKey!,
      },
    });

    if (!res.ok) {
      throw new UnauthorizedException('Invalid OAuth token');
    }

    const data = (await res.json()) as {
      email?: string;
      user_metadata?: { full_name?: string; name?: string };
    };
    if (!data.email) throw new UnauthorizedException('No email in OAuth token');

    return {
      email: data.email,
      name: data.user_metadata?.full_name ?? data.user_metadata?.name,
    };
  }

  async oauthLogin(supabaseToken: string): Promise<LoginResponseDto> {
    const { email, name } = await this.verifySupabaseToken(supabaseToken);

    let user = await this.usersService.findByEmail(email);

    if (!user) {
      const placeholder = await bcrypt.hash(crypto.randomUUID(), 12);
      user = await this.usersService.create(email, placeholder, ROLE_STUDENT);
      if (name) await this.usersService.update(user.id, { name });
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Account is not active');
    }

    return {
      ...(await this.issueTokenPair(user)),
      user: {
        id: user.id,
        email: user.email,
        is_active: user.is_active,
        role_id: user.role_id,
      },
    };
  }

  // ── Password reset ──────────────────────────────────────────────────────────

  /** Generate a reset token, store its hash, and email the reset link. Silent if the email is unknown. */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return; // never reveal whether an account exists

    const token = crypto.randomBytes(32).toString('hex');
    const hash = this.hashToken(token);
    const expires = Date.now() + 30 * 60 * 1000; // 30 minutes
    await this.usersService.setResetToken(user.id, hash, expires);

    const appUrl = (
      this.configService.get<string>('APP_URL') ?? 'http://localhost:5173'
    ).replace(/\/$/, '');
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    await this.mailService.sendPasswordReset(user.email, resetUrl);
  }

  /** Verify a reset token and set the new password (single-use). Signs the user out everywhere. */
  async resetPasswordWithToken(
    token: string,
    newPassword: string,
  ): Promise<void> {
    if (!token || !newPassword || newPassword.length < 8) {
      throw new BadRequestException(
        'A valid token and a password of at least 8 characters are required.',
      );
    }
    const hash = this.hashToken(token);
    const user = await this.usersService.findByResetTokenHash(hash);
    if (
      !user ||
      !user.reset_token_expires ||
      Number(user.reset_token_expires) < Date.now()
    ) {
      throw new BadRequestException(
        'This password reset link is invalid or has expired. Please request a new one.',
      );
    }
    const hashedPassword = await this.hashPassword(newPassword);
    await this.usersService.resetPassword(user.id, hashedPassword);
    await this.revokeAllForUser(user.id);
  }
}
