import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.enableCors();

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Wallet Service API')
    .setDescription('API documentation for Wallet Service with Paystack, JWT & API Keys')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT') // JWT auth
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'APIKey')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Server running on http://localhost:${process.env.PORT ?? 3000}/api/v1`);
  console.log(`Swagger docs: http://localhost:${process.env.PORT ?? 3000}/api-docs`);
}
bootstrap();
