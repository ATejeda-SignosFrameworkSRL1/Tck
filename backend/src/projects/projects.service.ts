import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Department } from '../departments/department.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
  ) {}

  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    const { createDefaultDepartments, ...projectData } = createProjectDto;

    const project = this.projectsRepository.create(projectData);
    const savedProject = await this.projectsRepository.save(project);

    // Si se solicita, crear departamentos por defecto
    if (createDefaultDepartments) {
      await this.initializeDepartments(savedProject.id);
    }

    return savedProject;
  }

  async findAll(includeInactive = false): Promise<Project[]> {
    const query = this.projectsRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.departments', 'department')
      .leftJoinAndSelect('project.tickets', 'ticket');

    if (!includeInactive) {
      query.where('project.isActive = :isActive', { isActive: true });
    }

    return query.orderBy('project.createdAt', 'DESC').getMany();
  }

  async findOne(id: number): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id },
      relations: ['departments', 'departments.userDepartments', 'tickets'],
    });

    if (!project) {
      throw new NotFoundException(`Proyecto con ID ${id} no encontrado`);
    }

    return project;
  }

  async update(id: number, updateProjectDto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(id);
    Object.assign(project, updateProjectDto);
    return this.projectsRepository.save(project);
  }

  async remove(id: number): Promise<void> {
    const project = await this.findOne(id);

    // Verificar si tiene tickets activos
    const activeTicketsCount = await this.projectsRepository
      .createQueryBuilder('project')
      .leftJoin('project.tickets', 'ticket')
      .where('project.id = :id', { id })
      .andWhere('ticket.status IN (:...statuses)', {
        statuses: ['new', 'in_progress'],
      })
      .getCount();

    if (activeTicketsCount > 0) {
      throw new BadRequestException(
        'No se puede eliminar un proyecto con tickets activos. Desactívelo en su lugar.',
      );
    }

    await this.projectsRepository.remove(project);
  }

  async initializeDepartments(projectId: number): Promise<Department[]> {
    const project = await this.findOne(projectId);

    const defaultDepartments = [
      { name: 'QA Proyectos', description: 'Departamento de Quality Assurance' },
      { name: 'Desarrollo', description: 'Departamento de Desarrollo' },
      { name: 'Implementación', description: 'Departamento de Implementación' },
    ];

    const departments: Department[] = [];

    for (const deptData of defaultDepartments) {
      const department = this.departmentsRepository.create({
        ...deptData,
        projectId: project.id,
      });
      const saved = await this.departmentsRepository.save(department);
      departments.push(saved);
    }

    return departments;
  }

  async deactivate(id: number): Promise<Project> {
    return this.update(id, { isActive: false });
  }

  async activate(id: number): Promise<Project> {
    return this.update(id, { isActive: true });
  }

  async getHierarchyStats() {
    const projects = await this.findAll(true);
    
    const stats = {
      totalProjects: projects.length,
      activeProjects: projects.filter((p) => p.isActive).length,
      totalDepartments: projects.reduce((sum, p) => sum + (p.departments?.length || 0), 0),
      totalUsers: 0,
      projectsDetail: projects.map((project) => ({
        id: project.id,
        name: project.name,
        isActive: project.isActive,
        departmentCount: project.departments?.length || 0,
        ticketCount: project.tickets?.length || 0,
        departments: project.departments?.map((dept) => {
          const ud = (dept as { userDepartments?: unknown[] }).userDepartments;
          return {
            id: dept.id,
            name: dept.name,
            userCount: Array.isArray(ud) ? ud.length : 0,
          };
        }),
      })),
    };

    return stats;
  }
}
