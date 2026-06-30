import { Module } from '@nestjs/common';
import { CacheModule } from './cache/cache.module';
import { EnvModule } from './config/env.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    // EnvModule must be first — it makes ConfigModule global
    EnvModule,

    // Infrastructure (global)
    DatabaseModule,
    CacheModule,

    // Queue (BullMQ)
    QueueModule,

    // Feature modules
    HealthModule,
  ],
})
export class AppModule {}
