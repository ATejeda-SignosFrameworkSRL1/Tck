import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MatrixService } from './matrix.service';
import { CreateMatrixItemDto } from './dto/create-matrix-item.dto';
import { UpdateMatrixItemDto } from './dto/update-matrix-item.dto';
import { CreateAcceptanceCriteriaDto } from './dto/create-acceptance-criteria.dto';
import { UpdateAcceptanceCriteriaDto } from './dto/update-acceptance-criteria.dto';
import { CreateDependencyDto } from './dto/create-dependency.dto';
import { UpdateDependencyDto } from './dto/update-dependency.dto';
import { CreateBaselineDto } from './dto/create-baseline.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('matrix')
@UseGuards(JwtAuthGuard)
export class MatrixController {
  constructor(private readonly matrixService: MatrixService) {}

  // ==================== MATRIX ITEMS ====================

  @Post('items')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  createItem(@Body() dto: CreateMatrixItemDto) {
    return this.matrixService.createItem(dto);
  }

  @Get('project/:projectId')
  getProjectTree(@Param('projectId') projectId: string) {
    return this.matrixService.getProjectTree(+projectId);
  }

  @Get('project/:projectId/flat')
  getProjectTreeFlat(@Param('projectId') projectId: string) {
    return this.matrixService.getProjectTreeFlat(+projectId);
  }

  @Get('project/:projectId/progress')
  getProjectProgress(@Param('projectId') projectId: string) {
    return this.matrixService.getProjectProgress(+projectId);
  }

  @Post('project/:projectId/recalculate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  recalculateProjectProgress(@Param('projectId') projectId: string) {
    return this.matrixService.recalculateProjectProgress(+projectId);
  }

  @Get('items/:id')
  getItem(@Param('id') id: string) {
    return this.matrixService.getItem(+id);
  }

  @Get('items/:id/with-tickets')
  getItemWithTickets(@Param('id') id: string) {
    return this.matrixService.getItemWithTickets(+id);
  }

  @Patch('items/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  updateItem(@Param('id') id: string, @Body() dto: UpdateMatrixItemDto) {
    return this.matrixService.updateItem(+id, dto);
  }

  @Delete('items/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  deleteItem(@Param('id') id: string) {
    return this.matrixService.deleteItem(+id);
  }

  // ==================== ACCEPTANCE CRITERIA ====================

  @Post('items/:id/criteria')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  addCriteria(
    @Param('id') id: string,
    @Body() dto: CreateAcceptanceCriteriaDto,
  ) {
    return this.matrixService.addCriteria(+id, dto);
  }

  @Patch('criteria/:criteriaId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  updateCriteria(
    @Param('criteriaId') criteriaId: string,
    @Body() dto: UpdateAcceptanceCriteriaDto,
  ) {
    return this.matrixService.updateCriteria(+criteriaId, dto);
  }

  @Patch('criteria/:criteriaId/verify')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  verifyCriteria(
    @Param('criteriaId') criteriaId: string,
    @Body() body: { isMet: boolean },
    @Request() req,
  ) {
    return this.matrixService.verifyCriteria(
      +criteriaId,
      req.user.userId,
      body.isMet,
    );
  }

  @Delete('criteria/:criteriaId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  deleteCriteria(@Param('criteriaId') criteriaId: string) {
    return this.matrixService.deleteCriteria(+criteriaId);
  }

  // ==================== DEPENDENCIES ====================

  @Post('dependencies')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  createDependency(@Body() dto: CreateDependencyDto) {
    return this.matrixService.createDependency(dto);
  }

  @Get('project/:projectId/dependencies')
  getDependencies(@Param('projectId') projectId: string) {
    return this.matrixService.getDependencies(+projectId);
  }

  @Patch('dependencies/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  updateDependency(
    @Param('id') id: string,
    @Body() dto: UpdateDependencyDto,
  ) {
    return this.matrixService.updateDependency(+id, dto);
  }

  @Delete('dependencies/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  deleteDependency(@Param('id') id: string) {
    return this.matrixService.deleteDependency(+id);
  }

  // ==================== BASELINES ====================

  @Post('baselines')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  createBaseline(@Body() dto: CreateBaselineDto, @Request() req) {
    return this.matrixService.createBaseline(dto, req.user.userId);
  }

  @Get('project/:projectId/baselines')
  getProjectBaselines(@Param('projectId') projectId: string) {
    return this.matrixService.getProjectBaselines(+projectId);
  }

  @Get('baselines/:id')
  getBaseline(@Param('id') id: string) {
    return this.matrixService.getBaseline(+id);
  }
}
