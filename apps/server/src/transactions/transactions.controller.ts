import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { createTransactionSchema, CreateTransactionDto } from './dto/create-transaction.dto';
import { updateTransactionSchema, UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionType } from './entities/transaction.entity';
import { ZodValidation } from '../common/decorators/zod-validation.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ZodValidation(createTransactionSchema)
  create(@CurrentUser() user: User, @Body() createTransactionDto: CreateTransactionDto) {
    return this.transactionsService.create(user.id, user.baseCurrency, createTransactionDto);
  }

  @Get()
  findAll(@CurrentUser() user: User, @Query('type') type?: TransactionType) {
    if (type) {
      return this.transactionsService.findByType(user.id, type);
    }
    return this.transactionsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.transactionsService.findOne(user.id, id);
  }

  @Patch(':id')
  @ZodValidation(updateTransactionSchema)
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(user.id, user.baseCurrency, id, updateTransactionDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.transactionsService.remove(user.id, id);
  }
}
