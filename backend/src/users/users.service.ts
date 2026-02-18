import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User, UserRole } from './user.entity';
import { UserDepartment } from './user-department.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserDepartment)
    private userDepartmentsRepository: Repository<UserDepartment>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }

  async findAll(departmentId?: number): Promise<User[]> {
    if (departmentId) {
      // Obtener usuarios de un departamento específico
      const userDepartments = await this.userDepartmentsRepository.find({
        where: { departmentId },
        relations: ['user'],
      });
      return userDepartments.map((ud) => ud.user);
    }

    return this.usersRepository.find({
      select: ['id', 'email', 'name', 'role', 'createdAt'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'email', 'name', 'role', 'createdAt'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async findOneWithDepartments(id: number): Promise<User & { departments: any[] }> {
    const user = await this.findOne(id);

    const userDepartments = await this.userDepartmentsRepository.find({
      where: { userId: id },
      relations: ['department'],
    });

    return {
      ...user,
      departments: userDepartments.map((ud) => ud.department),
    };
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, updateUserDto);
    await this.usersRepository.save(user);
    return this.findOne(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findDevelopers(): Promise<User[]> {
    return this.usersRepository.find({
      where: { role: UserRole.DEV },
      select: ['id', 'email', 'name', 'role'],
    });
  }

  // ============ Gestión de Departamentos del Usuario ============

  async getUserDepartments(userId: number): Promise<UserDepartment[]> {
    return this.userDepartmentsRepository.find({
      where: { userId },
      relations: ['department'],
    });
  }

  async assignDepartment(userId: number, departmentId: number): Promise<UserDepartment> {
    // Verificar que el usuario existe
    await this.findOne(userId);

    // Verificar si ya está asignado
    const existing = await this.userDepartmentsRepository.findOne({
      where: { userId, departmentId },
    });

    if (existing) {
      return existing;
    }

    const userDepartment = this.userDepartmentsRepository.create({
      userId,
      departmentId,
    });

    return this.userDepartmentsRepository.save(userDepartment);
  }

  async assignDepartments(userId: number, departmentIds: number[]): Promise<void> {
    // Verificar que el usuario existe
    await this.findOne(userId);

    // Eliminar asignaciones actuales
    await this.userDepartmentsRepository.delete({ userId });

    // Crear nuevas asignaciones
    if (departmentIds.length > 0) {
      const userDepartments = departmentIds.map((departmentId) =>
        this.userDepartmentsRepository.create({ userId, departmentId }),
      );
      await this.userDepartmentsRepository.save(userDepartments);
    }
  }

  async removeDepartment(userId: number, departmentId: number): Promise<void> {
    await this.userDepartmentsRepository.delete({ userId, departmentId });
  }

  // Obtener usuarios por múltiples departamentos
  async findByDepartments(departmentIds: number[]): Promise<User[]> {
    if (departmentIds.length === 0) {
      return [];
    }

    const userDepartments = await this.userDepartmentsRepository.find({
      where: { departmentId: In(departmentIds) },
      relations: ['user'],
    });

    // Eliminar duplicados
    const uniqueUsers = new Map<number, User>();
    userDepartments.forEach((ud) => {
      if (ud.user) {
        uniqueUsers.set(ud.user.id, ud.user);
      }
    });

    return Array.from(uniqueUsers.values());
  }
}
