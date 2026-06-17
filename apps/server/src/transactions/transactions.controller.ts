import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { createTransactionSchema, CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionType } from './entities/transaction.entity';
import { ZodValidation } from '../common/decorators/zod-validation.decorator';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ZodValidation(createTransactionSchema)
  create(@Body() createTransactionDto: CreateTransactionDto) {
    return this.transactionsService.create(createTransactionDto);
  }

  @Get()
  findAll(@Query('type') type?: TransactionType) {
    if (type) {
      return this.transactionsService.findByType(type);
    }
    return this.transactionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.transactionsService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.transactionsService.remove(id);
  }
}

