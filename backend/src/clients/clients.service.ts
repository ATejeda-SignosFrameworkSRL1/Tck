import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Project } from '../projects/project.entity';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
  ) {}

  async create(dto: CreateClientDto): Promise<Client> {
    const existing = await this.clientsRepository.findOne({
      where: { identification: dto.identification },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe un cliente con identificación ${dto.identification}`,
      );
    }
    const client = this.clientsRepository.create(dto);
    return this.clientsRepository.save(client);
  }

  async findAll(): Promise<Client[]> {
    return this.clientsRepository.find({
      relations: ['projects'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Client> {
    const client = await this.clientsRepository.findOne({
      where: { id },
      relations: ['projects'],
    });
    if (!client) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }
    return client;
  }

  async update(id: number, dto: UpdateClientDto): Promise<Client> {
    const client = await this.findOne(id);
    if (dto.identification && dto.identification !== client.identification) {
      const dup = await this.clientsRepository.findOne({
        where: { identification: dto.identification },
      });
      if (dup && Number(dup.id) !== Number(id)) {
        throw new ConflictException(
          `Ya existe un cliente con identificación ${dto.identification}`,
        );
      }
    }
    Object.assign(client, dto);
    return this.clientsRepository.save(client);
  }

  async remove(id: number): Promise<void> {
    const client = await this.clientsRepository.findOne({ where: { id } });
    if (!client) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    // Desasignar proyectos antes de eliminar (evita BadRequest y respeta FK ON DELETE SET NULL)
    await this.projectsRepository.update({ clientId: Number(id) }, { clientId: null });

    await this.clientsRepository.remove(client);
  }
}
