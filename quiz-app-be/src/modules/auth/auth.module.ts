import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../../core/mail/mail.module';
import { JwtGuard } from '../../core/guards/jwt.guard';

@Module({
  imports: [
    UsersModule,
    ConfigModule,
    MailModule,
    TypeOrmModule.forFeature([RefreshToken]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtGuard],
  exports: [AuthService],
})
export class AuthModule {}
