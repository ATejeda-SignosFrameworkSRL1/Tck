import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from './user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll(@Query('departmentId') departmentId?: string) {
    return this.usersService.findAll(departmentId ? +departmentId : undefined);
  }

  @Get('developers')
  findDevelopers() {
    return this.usersService.findDevelopers();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Get(':id/with-departments')
  findOneWithDepartments(@Param('id') id: string) {
    return this.usersService.findOneWithDepartments(+id);
  }

  @Get(':id/departments')
  getUserDepartments(@Param('id') id: string) {
    return this.usersService.getUserDepartments(+id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  // Asignar múltiples departamentos a un usuario
  @Patch(':id/departments')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  assignDepartments(
    @Param('id') id: string,
    @Body('departmentIds') departmentIds: number[],
  ) {
    return this.usersService.assignDepartments(+id, departmentIds);
  }

  // Añadir un departamento a un usuario
  @Post(':id/departments/:departmentId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  assignDepartment(
    @Param('id') id: string,
    @Param('departmentId') departmentId: string,
  ) {
    return this.usersService.assignDepartment(+id, +departmentId);
  }

  // Remover un departamento de un usuario
  @Delete(':id/departments/:departmentId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  removeDepartment(
    @Param('id') id: string,
    @Param('departmentId') departmentId: string,
  ) {
    return this.usersService.removeDepartment(+id, +departmentId);
  }
}
