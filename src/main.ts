import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    '/uploads',
    express.static(join(process.cwd(), 'uploads')),
  );

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(new ValidationPipe());

  await app.listen(process.env.PORT || 3000, '0.0.0.0');
}

bootstrap();