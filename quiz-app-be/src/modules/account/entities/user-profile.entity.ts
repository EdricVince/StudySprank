import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export interface SocialLink {
  platform: string;
  url: string;
}

/** Settings kept per account; every section is optional (a missing key means "default"). */
export interface UserPreferences {
  study?: { cardsPerDay?: number; studyMinutes?: number };
  notifications?: {
    email?: boolean;
    streakReminder?: boolean;
    achievements?: boolean;
    weeklyReport?: boolean;
    reminderTime?: string;
    timezone?: string;
  };
  privacy?: {
    publicProfile?: boolean;
    showStreak?: boolean;
    showAchievements?: boolean;
    analytics?: boolean;
  };
}

/**
 * What an account has on top of the sign-in record: the profile card (handle, phone, title,
 * location, bio, social links), the IELTS target band and the settings page (study, notification
 * and privacy preferences). One row per account, created the first time it is saved.
 */
@Entity('user_profiles')
export class UserProfile {
  @PrimaryColumn()
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_user_profiles_user',
  })
  user?: User;

  @Column({ type: 'varchar', length: 40, nullable: true })
  username: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  title: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  location: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  social_links: SocialLink[];

  @Column({ type: 'jsonb', default: () => "'{}'" })
  preferences: UserPreferences;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
