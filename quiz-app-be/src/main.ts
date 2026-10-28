import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { setupCors } from './core/security/cors.setup';
import { setupHelmet } from './core/security/helmet.setup';
import { setupSwagger } from './core/swagger/swagger.setup';

async function bootstrap() {
  // Default body parser is 100 KB; teacher verification documents (base64 photos) need more.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  app.useBodyParser('json', { limit: '4mb' });
  app.useBodyParser('urlencoded', { limit: '4mb', extended: true });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  // Behind one reverse proxy (Render) — use X-Forwarded-For for the client IP (rate limiting).
  app.set('trust proxy', 1);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  setupHelmet(app);
  setupCors(app);
  setupSwagger(app);

  await app.listen(port);
}
void bootstrap();
