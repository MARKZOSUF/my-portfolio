import { Pressable, StyleSheet, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/useTheme';
import { formatBytes, truncate } from '@/utils/format';
import { relativeTime } from '@/utils/dates';

export type DocumentStatus = 'queued' | 'processing' | 'ready' | 'failed';

export interface DocumentSummary {
  id: string;
  name: string;
  sizeBytes: number;
  status: DocumentStatus;
  pageCount?: number;
  createdAt: string;
}

const STATUS_LABEL: Record<DocumentStatus, string> = {
  queued: 'Queued',
  processing: 'Indexing\u2026',
  ready: 'Ready',
  failed: 'Failed',
};

export function DocumentListItem({ document, onPress }: { document: DocumentSummary; onPress?: (id: string) => void }) {
  const c = useTheme();
  const tint = document.status === 'failed' ? c.danger : document.status === 'ready' ? c.positive : c.attention;
  return (
    <Pressable accessibilityRole="button" disabled={onPress === undefined} onPress={() => onPress?.(document.id)}>
      <Card>
        <Text variant="subtitle" numberOfLines={2}>{truncate(document.name, 80)}</Text>
        <View style={s.meta}>
          <Text variant="caption" style={{ color: tint, fontWeight: '700' }}>{STATUS_LABEL[document.status]}</Text>
          <Text variant="caption" muted>{formatBytes(document.sizeBytes)}</Text>
          {document.pageCount !== undefined ? <Text variant="caption" muted>{document.pageCount} pages</Text> : null}
          <Text variant="caption" muted>{relativeTime(document.createdAt)}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

const s = StyleSheet.create({ meta: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' } });
