import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DeliverablesService } from './deliverables.service';
import { DeliverablesController } from './deliverables.controller';
import { DeliverableEntry } from './entities/deliverable-entry.entity';
import { DeliverableImageUpload } from './entities/deliverable-image-upload.entity';
import { Project } from '../projects/project.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeliverableEntry, DeliverableImageUpload, Project]),
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = /^image\/(png|jpeg|jpg|gif|webp|svg\+xml|svg)$/i.test(file.mimetype);
        cb(null, !!allowed);
      },
    }),
  ],
  controllers: [DeliverablesController],
  providers: [DeliverablesService],
  exports: [DeliverablesService],
})
export class DeliverablesModule {}
