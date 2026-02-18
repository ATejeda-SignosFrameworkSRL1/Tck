import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { Ticket } from './ticket.entity';
import { TicketAssignment } from './ticket-assignment.entity';
import { TicketTransition } from './ticket-transition.entity';
import { TicketChecklistItem } from './ticket-checklist-item.entity';
import { TicketAttachment } from './ticket-attachment.entity';
import { UsersModule } from '../users/users.module';
import { DepartmentsModule } from '../departments/departments.module';
import { TagsModule } from '../tags/tags.module';
import { MatrixItem } from '../matrix/entities/matrix-item.entity';
import { Project } from '../projects/project.entity';
import { Department } from '../departments/department.entity';

const uploadsRoot = join(process.cwd(), 'uploads', 'tickets');

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ticket,
      TicketAssignment,
      TicketTransition,
      TicketChecklistItem,
      TicketAttachment,
      MatrixItem,
      Project,
      Department,
    ]),
    MulterModule.register({
      storage: diskStorage({
        destination: (req, _file, cb) => {
          const ticketId = req.params?.id || 'temp';
          const dir = join(uploadsRoot, String(ticketId));
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const ext = file.originalname?.match(/\.[^.]+$/)?.[0] || '';
          const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
          cb(null, name);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
    UsersModule,
    DepartmentsModule,
    TagsModule,
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService, TypeOrmModule],
})
export class TicketsModule {}
