import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { createCategorySchema, CreateCategoryDto } from './dto/create-category.dto';
import { updateCategorySchema, UpdateCategoryDto } from './dto/update-category.dto';
import { ZodValidation } from '../common/decorators/zod-validation.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ZodValidation(createCategorySchema)
  create(@CurrentUser() user: User, @Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(user.id, createCategoryDto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.categoriesService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.findOne(user.id, id);
  }

  @Patch(':id')
  @ZodValidation(updateCategorySchema)
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(user.id, id, updateCategoryDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.remove(user.id, id);
  }
}
