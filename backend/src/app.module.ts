import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthMiddleware } from './middlewares/auth.middleware';
import { AuditLogMiddleware } from './middlewares/auditLog.middleware';
import { RateLimitMiddleware } from './middlewares/rateLimit.middleware';
import { RequestLoggerMiddleware } from './middlewares/requestLogger.middleware';
import { RbacMiddleware } from './middlewares/rbac.middleware';
import { databaseConfig } from './config/database.config';
import { jwtConfig } from './config/jwt.config';
import { redisConfig } from './config/redis.config';
import { BudgetController } from './controllers/budget.controller';
import { ChangeOrderController } from './controllers/changeOrder.controller';
import { CostItemController } from './controllers/costItem.controller';
import { HealthController } from './controllers/health.controller';
import { MaterialController } from './controllers/material.controller';
import { ReportController } from './controllers/report.controller';
import { AuditLog } from './models/auditLog.entity';
import { ChangeOrder } from './models/changeOrder.entity';
import { CostItem } from './models/costItem.entity';
import { CostReport } from './models/costReport.entity';
import { Material } from './models/material.entity';
import { MaterialRequisition } from './models/materialRequisition.entity';
import { ProjectBudget } from './models/budget.entity';
import { Role } from './models/role.entity';
import { AnalyticsService } from './services/analytics.service';
import { AuditLogService } from './services/auditLog.service';
import { BudgetService } from './services/budget.service';
import { ChangeOrderService } from './services/changeOrder.service';
import { CostItemService } from './services/costItem.service';
import { MaterialService } from './services/material.service';
import { RedisService } from './services/redis.service';
import { ReportService } from './services/report.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
      load: [jwtConfig, redisConfig]
    }),
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig
    }),
    TypeOrmModule.forFeature([ProjectBudget, CostItem, ChangeOrder, CostReport, AuditLog, Role, Material, MaterialRequisition])
  ],
  controllers: [HealthController, BudgetController, CostItemController, ChangeOrderController, MaterialController, ReportController],
  providers: [
    AnalyticsService,
    AuditLogService,
    BudgetService,
    ChangeOrderService,
    CostItemService,
    MaterialService,
    RedisService,
    RbacMiddleware,
    ReportService
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
    consumer.apply(RateLimitMiddleware).exclude('health', 'api-docs', 'api-docs/(.*)').forRoutes('*');
    consumer.apply(AuthMiddleware).exclude('health', 'api-docs', 'api-docs/(.*)').forRoutes('*');
    consumer.apply(AuditLogMiddleware).exclude('health', 'api-docs', 'api-docs/(.*)').forRoutes('*');
  }
}
