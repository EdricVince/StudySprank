import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: true })
  is_active: boolean;

  // role_id references roles(id) at the app level; roles are static reference
  // data (never deleted) so no DB FK is enforced here — see the FKs on
  // user-generated data instead (scripts/sync-foreign-keys.ts).
  @Column({ default: 1 })
  role_id: number;

  @Column({ type: 'varchar', nullable: true, default: null })
  name: string | null;

  @Column({ type: 'varchar', nullable: true, default: null })
  avatar: string | null;

  // Base64 data URL of the teacher's ID card image (uploaded by admin for verification)
  @Column({ type: 'text', nullable: true, default: null })
  teacher_card_image: string | null;

  // Whether the teacher's identity has been verified (card uploaded / confirmed by admin)
  @Column({ default: false })
  is_verified: boolean;

  // Password-reset: SHA-256 hash of the emailed token + its expiry (epoch ms as string)
  @Column({ type: 'varchar', nullable: true, default: null })
  reset_token_hash: string | null;

  @Column({ type: 'bigint', nullable: true, default: null })
  reset_token_expires: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
