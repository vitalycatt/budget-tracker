import { useQuery } from '@tanstack/react-query';
import { exchangeRatesApi } from '@/lib/api';

/** Текущие курсы всех валют к USD (пивот). Кросс-курс from→to = rates[to] / rates[from]. */
export function useExchangeRates() {
  return useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const response = await exchangeRatesApi.getRates();
      return response.data;
    },
    staleTime: 60 * 60 * 1000, // 1 час — курсы обновляются раз в сутки
  });
}
