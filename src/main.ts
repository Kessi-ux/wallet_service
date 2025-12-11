import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.enableCors();

  app.use('/wallet/paystack/webhook', bodyParser.raw({ type: '*/*' }));

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

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  // Get the actual URL (works locally and in production)
  const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;

  console.log(`Server running on ${baseUrl}/api/v1`);
  console.log(`Swagger docs: ${baseUrl}/api-docs`);
}
bootstrap();
