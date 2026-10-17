import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

/** Small key/value store for settings changed at runtime from the admin dashboard. */
@Entity('app_settings')
export class AppSetting {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  key: string;

  /** Secrets are stored encrypted (see core/security/secret-box.ts). */
  @Column({ type: 'text' })
  value: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
