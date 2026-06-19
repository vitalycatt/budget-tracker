import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import type { Currency } from '@/stores/financeStore';
import { toast } from 'sonner';

const USER_QUERY_KEY = ['user', 'me'] as const;

export function useCurrentUser() {
  return useQuery({
    queryKey: USER_QUERY_KEY,
    queryFn: async () => {
      const response = await usersApi.getMe();
      return response.data;
    },
  });
}

export function useOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (baseCurrency: Currency) => {
      const response = await usersApi.onboarding(baseCurrency);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Базовая валюта сохранена');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка при сохранении');
    },
  });
}
