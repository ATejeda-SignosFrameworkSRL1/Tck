import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { networkInterfaces } from 'os';

function getLocalIP(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (origin, callback) => {
      const allowed =
        !origin ||
        /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
        /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
        /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
        /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin) ||
        /^https?:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+(:\d+)?$/.test(origin);
      callback(allowed ? null : new Error('CORS not allowed'), allowed ? true : false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  const localIP = getLocalIP();
  const frontendPort = 5173;
  console.log('');
  console.log('='.repeat(60));
  console.log(`  🚀 Backend (API) escuchando en 0.0.0.0:${port}`);
  console.log(`     Local:   http://localhost:${port}`);
  console.log(`     Red:     http://${localIP}:${port}`);
  console.log('='.repeat(60));
  console.log(`  📋 URL para QA (abrir en el navegador):`);
  console.log(`     http://${localIP}:${frontendPort}`);
  console.log('='.repeat(60));
  console.log('');
}
bootstrap();
