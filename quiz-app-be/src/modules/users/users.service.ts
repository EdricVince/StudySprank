import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { ROLE_TEACHER } from '../roles/entities/role.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async create(
    email: string,
    hashedPassword: string,
    roleId?: number,
  ): Promise<User> {
    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
      ...(roleId ? { role_id: roleId } : {}),
    });
    return this.usersRepository.save(user);
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async update(
    id: number,
    data: Partial<Pick<User, 'name' | 'avatar'>>,
  ): Promise<void> {
    await this.usersRepository.update(id, data);
  }

  // ── Teacher applications ────────────────────────────────────────────────────

  /** A self-registered teacher: role TEACHER, status 'pending' until an admin approves. */
  async createTeacherApplicant(data: {
    email: string;
    hashedPassword: string;
    name: string;
    organization: string;
    cardImage: string;
  }): Promise<User> {
    const user = this.usersRepository.create({
      email: data.email,
      password: data.hashedPassword,
      name: data.name,
      role_id: ROLE_TEACHER,
      teacher_status: 'pending',
      teacher_organization: data.organization,
      teacher_card_image: data.cardImage,
      is_verified: false,
    });
    return this.usersRepository.save(user);
  }

  /** (Re)submit the verification document: back to 'pending' for the admin to review. */
  async submitTeacherApplication(
    id: number,
    cardImage: string,
    organization?: string,
  ): Promise<void> {
    await this.usersRepository.update(id, {
      teacher_card_image: cardImage,
      ...(organization ? { teacher_organization: organization } : {}),
      teacher_status: 'pending',
      teacher_reject_reason: null,
      teacher_reviewed_at: null,
      is_verified: false,
    });
  }

  // ── Password reset ──────────────────────────────────────────────────────────
  async setResetToken(
    id: number,
    hash: string,
    expiresEpochMs: number,
  ): Promise<void> {
    await this.usersRepository.update(id, {
      reset_token_hash: hash,
      reset_token_expires: String(expiresEpochMs),
    });
  }

  async findByResetTokenHash(hash: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { reset_token_hash: hash } });
  }

  async resetPassword(id: number, hashedPassword: string): Promise<void> {
    await this.usersRepository.update(id, {
      password: hashedPassword,
      reset_token_hash: null,
      reset_token_expires: null,
    });
  }
}
