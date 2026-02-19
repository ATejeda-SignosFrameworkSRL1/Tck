import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatrixService } from './matrix.service';
import { MatrixController } from './matrix.controller';
import { MatrixItem } from './entities/matrix-item.entity';
import { MatrixAcceptanceCriteria } from './entities/matrix-acceptance-criteria.entity';
import { MatrixDependency } from './entities/matrix-dependency.entity';
import { ProjectBaseline } from './entities/project-baseline.entity';
import { BaselineSnapshot } from './entities/baseline-snapshot.entity';
import { Ticket } from '../tickets/ticket.entity';
import { Project } from '../projects/project.entity';
import { DeliverablesModule } from '../deliverables/deliverables.module';

@Module({
  imports: [
    DeliverablesModule,
    TypeOrmModule.forFeature([
      MatrixItem,
      MatrixAcceptanceCriteria,
      MatrixDependency,
      ProjectBaseline,
      BaselineSnapshot,
      Ticket,
      Project,
    ]),
  ],
  controllers: [MatrixController],
  providers: [MatrixService],
  exports: [MatrixService, TypeOrmModule],
})
export class MatrixModule {}
