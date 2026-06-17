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
import { AccountsService } from './accounts.service';
import { createAccountSchema, CreateAccountDto } from './dto/create-account.dto';
import { updateAccountSchema, UpdateAccountDto } from './dto/update-account.dto';
import { ZodValidation } from '../common/decorators/zod-validation.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @ZodValidation(createAccountSchema)
  create(@CurrentUser() user: User, @Body() createAccountDto: CreateAccountDto) {
    return this.accountsService.create(user.id, createAccountDto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.accountsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.accountsService.findOne(user.id, id);
  }

  @Patch(':id')
  @ZodValidation(updateAccountSchema)
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAccountDto: UpdateAccountDto,
  ) {
    return this.accountsService.update(user.id, id, updateAccountDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.accountsService.remove(user.id, id);
  }
}
