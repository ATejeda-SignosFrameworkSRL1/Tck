import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TicketsModule } from './tickets/tickets.module';
import { CommentsModule } from './comments/comments.module';
import { TrackingModule } from './tracking/tracking.module';
import { ProjectsModule } from './projects/projects.module';
import { DepartmentsModule } from './departments/departments.module';
import { TagsModule } from './tags/tags.module';
import { MatrixModule } from './matrix/matrix.module';
import { GanttModule } from './gantt/gantt.module';
import { MetricsModule } from './metrics/metrics.module';
import { DeliverablesModule } from './deliverables/deliverables.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'SistemadeTickets',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false, // No alterar tablas existentes (core, public, etc.)
      logging: true,
    }),
    AuthModule,
    UsersModule,
    TicketsModule,
    CommentsModule,
    TrackingModule,
    ProjectsModule,
    DepartmentsModule,
    TagsModule,
    MatrixModule,
    GanttModule,
    MetricsModule,
    DeliverablesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
