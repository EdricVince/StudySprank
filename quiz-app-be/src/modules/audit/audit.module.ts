import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLog } from './entities/activity-log.entity';
import { Class } from '../classes/entities/class.entity';
import { ActivityLogService } from './activity-log.service';
import { AuditController } from './audit.controller';
import { AuditInterceptor } from './audit.interceptor';

/** Activity trail: who created/changed what (classes, tests, assignments…) and when. */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ActivityLog, Class])],
  controllers: [AuditController],
  providers: [
    ActivityLogService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [ActivityLogService],
})
export class AuditModule {}
