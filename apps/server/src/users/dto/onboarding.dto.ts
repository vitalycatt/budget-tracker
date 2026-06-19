import { z } from 'zod';
import { CURRENCIES } from '@swt/shared';

export const onboardingSchema = z.object({
  baseCurrency: z.enum(CURRENCIES, {
    errorMap: () => ({ message: 'Неподдерживаемая валюта' }),
  }),
});

export type OnboardingDto = z.infer<typeof onboardingSchema>;
