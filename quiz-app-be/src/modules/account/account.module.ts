import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProfile } from './entities/user-profile.entity';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { AuthModule } from '../auth/auth.module';
import { AdminModule } from '../admin/admin.module';
import { UsersModule } from '../users/users.module';

/** Profile card, settings, password change, data export and self-service account deletion. */
@Module({
  imports: [
    TypeOrmModule.forFeature([UserProfile]),
    AuthModule,
    AdminModule,
    UsersModule,
  ],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
