import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { UploadsModule } from "../uploads/uploads.module";
import { MaintenanceService } from "./maintenance.service";

/**
 * The service is always provided so it can be invoked directly (by a test or a
 * one-off job). Only the scheduler is conditional: without `ScheduleModule`
 * the `@Cron` decorators are never discovered, so `ENABLE_JOBS=false` replicas
 * keep the code without running it on a timer.
 */
@Module({
  imports: [...(process.env.ENABLE_JOBS === "false" ? [] : [ScheduleModule.forRoot()]), UploadsModule],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
