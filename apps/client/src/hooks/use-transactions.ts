import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '@/lib/api';
import type { Transaction, TransactionType } from '@/stores/financeStore';
import { toast } from 'sonner';

const TRANSACTIONS_QUERY_KEY = ['transactions'] as const;

export function useTransactions(type?: TransactionType) {
  return useQuery({
    queryKey: [...TRANSACTIONS_QUERY_KEY, type],
    queryFn: async () => {
      const response = await transactionsApi.getAll(type);
      return response.data;
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Transaction, 'id'>) => {
      const response = await transactionsApi.create(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Транзакция успешно создана');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка при создании транзакции');
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await transactionsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Транзакция успешно удалена');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка при удалении транзакции');
    },
  });
}

