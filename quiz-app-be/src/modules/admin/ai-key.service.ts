import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSetting } from './entities/app-setting.entity';
import { isAnthropicKey, setAnthropicKey } from '../../core/ai/anthropic';
import { open, seal } from '../../core/security/secret-box';

const SETTING = 'anthropic_api_key';

/**
 * Keeps the Anthropic key set from the admin dashboard in the database (encrypted),
 * so it survives restarts/redeploys on hosts without a writable disk (Render).
 * A key saved here takes precedence over the ANTHROPIC_API_KEY environment variable.
 */
@Injectable()
export class AiKeyService implements OnModuleInit {
  private readonly logger = new Logger(AiKeyService.name);

  constructor(
    @InjectRepository(AppSetting) private settings: Repository<AppSetting>,
    private config: ConfigService,
  ) {}

  private get secret(): string {
    return this.config.get<string>('JWT_SECRET') ?? '';
  }

  async onModuleInit(): Promise<void> {
    try {
      const row = await this.settings.findOne({ where: { key: SETTING } });
      if (!row) {
        this.logStatus('no key saved in the admin settings');
        return;
      }
      const key = open(row.value, this.secret);
      if (isAnthropicKey(key)) {
        setAnthropicKey(key!);
        this.logStatus('key saved in the admin settings');
      } else
        this.logger.warn(
          'Stored AI key could not be decrypted (JWT_SECRET changed?) — set it again in admin settings.',
        );
    } catch (e) {
      this.logger.error(`Could not load the stored AI key: ${String(e)}`);
    }
  }

  /** One line in the start-up log: are the AI features on, and where does the key come from? */
  private logStatus(source: string) {
    if (isAnthropicKey(process.env.ANTHROPIC_API_KEY)) {
      this.logger.log(`AI features: ENABLED (${source})`);
    } else {
      this.logger.warn(
        `AI features: DISABLED — ${source}; set ANTHROPIC_API_KEY or the key in the admin AI settings`,
      );
    }
  }

  async save(key: string): Promise<void> {
    await this.settings.save({ key: SETTING, value: seal(key, this.secret) });
    setAnthropicKey(key);
  }

  /** Removes the stored key; an ANTHROPIC_API_KEY env var would apply again after a restart. */
  async remove(): Promise<void> {
    await this.settings.delete({ key: SETTING });
    setAnthropicKey('');
  }
}
