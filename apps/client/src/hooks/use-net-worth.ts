import { useQuery } from '@tanstack/react-query';
import { accountsApi } from '@/lib/api';

export function useNetWorth() {
  return useQuery({
    queryKey: ['accounts', 'net-worth'],
    queryFn: async () => {
      const response = await accountsApi.getNetWorth();
      return response.data;
    },
  });
}
