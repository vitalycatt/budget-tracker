import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transfersApi, type CreateTransferInput } from '@/lib/api';
import { toast } from 'sonner';

const TRANSFERS_QUERY_KEY = ['transfers'] as const;

export function useTransfers() {
  return useQuery({
    queryKey: TRANSFERS_QUERY_KEY,
    queryFn: async () => {
      const response = await transfersApi.getAll();
      return response.data;
    },
  });
}

/** Инвалидируем балансы счетов и состояние — перевод их меняет. */
function invalidateAccountState(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: TRANSFERS_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ['accounts'] });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTransferInput) => {
      const response = await transfersApi.create(data);
      return response.data;
    },
    onSuccess: () => {
      invalidateAccountState(queryClient);
      toast.success('Перевод выполнен');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка при переводе');
    },
  });
}

export function useDeleteTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await transfersApi.delete(id);
    },
    onSuccess: () => {
      invalidateAccountState(queryClient);
      toast.success('Перевод удалён');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка при удалении перевода');
    },
  });
}
