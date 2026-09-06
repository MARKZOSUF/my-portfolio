import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/useTheme';
import { formatDateTime } from '@/utils/dates';

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  pending?: boolean;
}

export function ChatBubble({ message }: { message: ChatMessage }) {
  const c = useTheme();
  const mine = message.role === 'user';
  return (
    <View style={[s.row, mine ? s.right : s.left]}>
      <View
        style={[
          s.bubble,
          {
            backgroundColor: mine ? c.primary : c.raised,
            borderColor: mine ? c.primary : c.border,
            opacity: message.pending === true ? 0.6 : 1,
          },
        ]}
      >
        <Text style={{ color: mine ? '#fff' : c.text }}>{message.content}</Text>
        <Text variant="caption" style={{ color: mine ? '#EAF3FC' : c.muted }}>
          {message.pending === true ? 'Sending\u2026' : formatDateTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', width: '100%' },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '86%', borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 },
});
