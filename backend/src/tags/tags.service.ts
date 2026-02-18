import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from './tag.entity';
import { TicketTag } from './ticket-tag.entity';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private tagsRepository: Repository<Tag>,
    @InjectRepository(TicketTag)
    private ticketTagsRepository: Repository<TicketTag>,
  ) {}

  async findAll(): Promise<Tag[]> {
    return this.tagsRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number): Promise<Tag> {
    const tag = await this.tagsRepository.findOne({ where: { id } });
    if (!tag) throw new NotFoundException('Tag no encontrado');
    return tag;
  }

  async create(dto: CreateTagDto): Promise<Tag> {
    const exists = await this.tagsRepository.findOne({ where: { name: dto.name } });
    if (exists) throw new ConflictException('Ya existe un tag con ese nombre');

    const tag = this.tagsRepository.create({
      name: dto.name,
      color: dto.color || '#6366F1',
      icon: dto.icon || null,
    });
    return this.tagsRepository.save(tag);
  }

  async update(id: number, dto: UpdateTagDto): Promise<Tag> {
    const tag = await this.findOne(id);

    if (dto.name && dto.name !== tag.name) {
      const exists = await this.tagsRepository.findOne({ where: { name: dto.name } });
      if (exists) throw new ConflictException('Ya existe un tag con ese nombre');
    }

    Object.assign(tag, dto);
    return this.tagsRepository.save(tag);
  }

  async remove(id: number): Promise<void> {
    const tag = await this.findOne(id);
    await this.tagsRepository.remove(tag);
  }

  // ====== Ticket-Tag association ======

  async addTagToTicket(ticketId: number, tagId: number): Promise<TicketTag> {
    await this.findOne(tagId);
    const existing = await this.ticketTagsRepository.findOne({
      where: { ticketId, tagId },
    });
    if (existing) return existing;

    const ticketTag = this.ticketTagsRepository.create({ ticketId, tagId });
    return this.ticketTagsRepository.save(ticketTag);
  }

  async removeTagFromTicket(ticketId: number, tagId: number): Promise<void> {
    const ticketTag = await this.ticketTagsRepository.findOne({
      where: { ticketId, tagId },
    });
    if (!ticketTag) throw new NotFoundException('El ticket no tiene ese tag');
    await this.ticketTagsRepository.remove(ticketTag);
  }

  async getTagsForTicket(ticketId: number): Promise<Tag[]> {
    const ticketTags = await this.ticketTagsRepository.find({
      where: { ticketId },
      relations: ['tag'],
    });
    return ticketTags.map((tt) => tt.tag);
  }
}
