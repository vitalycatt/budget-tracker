import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TransfersService } from './transfers.service';
import { createTransferSchema, CreateTransferDto } from './dto/create-transfer.dto';
import { ZodValidation } from '../common/decorators/zod-validation.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @ZodValidation(createTransferSchema)
  create(@CurrentUser() user: User, @Body() dto: CreateTransferDto) {
    return this.transfersService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.transfersService.findAll(user.id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.transfersService.remove(user.id, id);
  }
}
