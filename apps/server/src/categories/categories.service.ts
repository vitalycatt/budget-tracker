import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
  ) {}

  async create(userId: string, createCategoryDto: CreateCategoryDto): Promise<Category> {
    const category = this.categoriesRepository.create({
      ...(createCategoryDto as Partial<Category>),
      userId,
    });
    return await this.categoriesRepository.save(category);
  }

  async findAll(userId: string): Promise<Category[]> {
    return await this.categoriesRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, id: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({ where: { id, userId } });
    if (!category) {
      throw new NotFoundException(`Категория с ID ${id} не найдена`);
    }
    return category;
  }

  async update(userId: string, id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(userId, id);
    Object.assign(category, updateCategoryDto);
    return await this.categoriesRepository.save(category);
  }

  async remove(userId: string, id: string): Promise<void> {
    const category = await this.findOne(userId, id);
    await this.categoriesRepository.remove(category);
  }
}
