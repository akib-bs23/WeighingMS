import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { type DynamicModule, Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { BatchesModule } from './batches/batches.module';
import { ClockModule } from './common/clock/clock';
import { HealthController } from './common/health/health.controller';
import { DatabaseModule } from './database/database.module';
import { OrgatexModule } from './integrations/orgatex/orgatex.module';
import { PrinterModule } from './integrations/printer/printer.module';
import { ScaleModule } from './integrations/scale/scale.module';
import { ScannerModule } from './integrations/scanner/scanner.module';
import { StationModule } from './station/station.module';
import { TicketsModule } from './tickets/tickets.module';
import { TrainingModule } from './training/training.module';
import { WeighingModule } from './weighing/weighing.module';

const CLIENT_DIST = resolve('dist/client');

/** In production (`pnpm build && pnpm start`) the built station UI is served by the API process. */
function staticClient(): DynamicModule[] {
  if (!existsSync(CLIENT_DIST)) return [];
  return [ServeStaticModule.forRoot({ rootPath: CLIENT_DIST, exclude: ['/api/{*path}'] })];
}

@Module({
  imports: [
    ClockModule,
    DatabaseModule,
    TrainingModule,
    OrgatexModule,
    PrinterModule,
    ScaleModule,
    ScannerModule,
    BatchesModule,
    StationModule,
    WeighingModule,
    TicketsModule,
    ...staticClient(),
  ],
  controllers: [HealthController],
})
export class AppModule {}
