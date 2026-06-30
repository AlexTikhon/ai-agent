import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './env.schema';

/**
 * Wraps @nestjs/config with Zod validation.
 * Imported once in AppModule (isGlobal: true propagates ConfigService everywhere).
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: (raw: Record<string, unknown>) => {
        const result = envSchema.safeParse(raw);
        if (!result.success) {
          const formatted = result.error.errors
            .map((e) => `  ${e.path.join('.')}: ${e.message}`)
            .join('\n');
          throw new Error(`\n[EnvModule] Environment validation failed:\n${formatted}\n`);
        }
        return result.data;
      },
    }),
  ],
  exports: [ConfigModule],
})
export class EnvModule {}
