import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
  ) {}

  async create(createDepartmentDto: CreateDepartmentDto): Promise<Department> {
    const department = this.departmentsRepository.create(createDepartmentDto);
    return this.departmentsRepository.save(department);
  }

  async findAll(projectId?: number): Promise<Department[]> {
    const query = this.departmentsRepository
      .createQueryBuilder('department')
      .leftJoinAndSelect('department.project', 'project')
      .leftJoinAndSelect('department.userDepartments', 'userDepartments');

    if (projectId) {
      query.where('department.projectId = :projectId', { projectId });
    }

    return query.orderBy('department.name', 'ASC').getMany();
  }

  async findOne(id: number): Promise<Department> {
    const department = await this.departmentsRepository.findOne({
      where: { id },
      relations: ['project', 'userDepartments'],
    });

    if (!department) {
      throw new NotFoundException(`Departamento con ID ${id} no encontrado`);
    }

    return department;
  }

  async update(
    id: number,
    updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<Department> {
    const department = await this.findOne(id);
    Object.assign(department, updateDepartmentDto);
    return this.departmentsRepository.save(department);
  }

  async remove(id: number): Promise<void> {
    const department = await this.findOne(id);

    // Verificar si tiene usuarios asignados (relación userDepartments por user_departments)
    const ud = (department as { userDepartments?: unknown[] }).userDepartments;
    if (Array.isArray(ud) && ud.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar un departamento con usuarios asignados',
      );
    }

    await this.departmentsRepository.remove(department);
  }

  async getUsersCount(id: number): Promise<number> {
    const department = await this.departmentsRepository.findOne({
      where: { id },
      relations: ['userDepartments'],
    });

    const list = (department as { userDepartments?: unknown[] } | null)
      ?.userDepartments;
    return Array.isArray(list) ? list.length : 0;
  }
}
