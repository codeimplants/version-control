import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      let hostname: string;
      try {
        hostname = new URL(origin).hostname;
      } catch {
        console.warn(`CORS: could not parse origin "${origin}"`);
        return callback(null, false);
      }

      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(
        origin,
      );

      const isLovable = /\.lovable\.app$/.test(hostname);

      const isCodeImplants =
        hostname === 'codeimplants.com' ||
        /\.codeimplants\.com$/.test(hostname);

      if (isLocalhost || isLovable || isCodeImplants) {
        return callback(null, true);
      }

      console.warn(`CORS blocked for origin: ${origin}`);
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT || 6000);
}

bootstrap().catch((err) => {
  console.error('Failed to start application', err);
  process.exit(1);
});
