import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ConfigService } from '@nestjs/config';

declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get('PORT');
  app.useWebSocketAdapter(new IoAdapter(app));

  

  app.enableCors({
    origin: '*',
  });
  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
}

  await app.listen(port ?? 5000, '0.0.0.0');
}

bootstrap();