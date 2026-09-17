import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { prepareDatabase } from "./prepare-database";

async function bootstrap() {
  prepareDatabase();

  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(",").map((v) => v.trim()) ?? [
      "http://localhost:3000",
    ],
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle("HaytHive Dock API")
    .setDescription(
      "Control plane for the HaytHive dock management MVP: lid, platform, charging, and readiness.",
    )
    .setVersion("0.1.0")
    .addCookieAuth("haythive_session")
    .addTag("Auth", "Operator authentication and session management.")
    .addTag("Devices", "Dock device registry and live projected state.")
    .addTag(
      "Actuators",
      "Lid and platform actuator commands dispatched to the dock edge.",
    )
    .addTag(
      "Device Ingest",
      "Edge/simulator heartbeat and dock state ingestion.",
    )
    .addTag("Health", "Service and dependency health checks.")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document, {
    jsonDocumentUrl: "api/docs-json",
  });

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
}

bootstrap();
