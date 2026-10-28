import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { AiKeyService } from './ai-key.service';
import { AppSetting } from './entities/app-setting.entity';
import { User } from '../users/entities/user.entity';
import { UserProgress } from '../progress/entities/user-progress.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserProgress, AppSetting])],
  controllers: [AdminController],
  providers: [AdminService, AdminBootstrapService, AiKeyService],
})
export class AdminModule {}
