import { Body, Controller, Get, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from './entities/user.entity';
import { ZodValidation } from '../common/decorators/zod-validation.decorator';
import { onboardingSchema, OnboardingDto } from './dto/onboarding.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** Текущий пользователь (создаётся автоматически гвардом при первом обращении). */
  @Get('me')
  me(@CurrentUser() user: User) {
    return user;
  }

  /** Завершение онбординга: выбор базовой валюты. */
  @Post('me/onboarding')
  @ZodValidation(onboardingSchema)
  onboarding(@CurrentUser() user: User, @Body() dto: OnboardingDto) {
    return this.usersService.completeOnboarding(user.id, dto.baseCurrency);
  }
}
