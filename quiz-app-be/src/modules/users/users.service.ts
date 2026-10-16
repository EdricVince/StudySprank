import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

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
