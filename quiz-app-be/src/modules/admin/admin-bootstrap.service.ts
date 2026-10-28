import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { ROLE_ADMIN } from '../roles/entities/role.entity';

/**
 * Creates the first administrator from ADMIN_EMAIL / ADMIN_PASSWORD when the
 * database has no account with that email (hosting such as Render has no shell
 * to run a script). An existing account is never promoted or overwritten, so
 * nobody can take over the admin role by registering that email first.
 */
@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const email = this.config.get<string>('ADMIN_EMAIL')?.trim().toLowerCase();
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!email || !password) return;

    if (password.length < 8) {
      this.logger.warn(
        'ADMIN_PASSWORD must be at least 8 characters — skipped.',
      );
      return;
    }

    try {
      const existing = await this.users.findOne({ where: { email } });
      if (existing) {
        if (existing.role_id !== ROLE_ADMIN) {
          this.logger.warn(
            `ADMIN_EMAIL (${email}) belongs to a non-admin account — not promoted.`,
          );
        }
        return;
      }
      await this.users.save(
        this.users.create({
          email,
          password: await bcrypt.hash(password, 12),
          name: 'Administrator',
          role_id: ROLE_ADMIN,
          is_active: true,
          is_verified: true,
        }),
      );
      this.logger.log(`Created the first administrator account: ${email}`);
    } catch (e) {
      this.logger.error('Admin bootstrap failed', e);
    }
  }
}
