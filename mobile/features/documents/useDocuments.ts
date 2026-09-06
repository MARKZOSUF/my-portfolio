import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api/client';
import { API, config } from '@/constants/config';
import type { DocumentSummary } from '@/components/documents/DocumentListItem';

interface DocumentListResponse {
  items: DocumentSummary[];
  next_cursor: string | null;
}

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
}

export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: async () => (await api.get<DocumentListResponse>(API.documents.list)).items,
    staleTime: 15_000,
    // Poll while anything is still indexing.
    refetchInterval: (query) => {
      const items = query.state.data;
      if (!items) return false;
      return items.some((d) => d.status === 'queued' || d.status === 'processing') ? 4_000 : false;
    },
  });
}

export function useUploadDocument() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (file: PickedFile) => {
      if (file.size > config.maxUploadBytes) {
        throw new Error('That file is larger than the 25 MB limit.');
      }
      const body = new FormData();
      // React Native FormData accepts this file descriptor shape.
      body.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
      return api.upload<DocumentSummary>(API.documents.upload, body);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
