/**
 * Structured note viewer.
 *
 * Renders the structured note document (never raw Markdown), with a table of
 * contents, collapsible sections, typed blocks (definition, formula, solved
 * example, common mistake, table, diagram, citation), font-size control,
 * dark mode, in-note search and sanitized external links.
 */
import React, { useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';

export interface NoteBlock {
  kind: string;
  text?: string;
  items?: unknown[];
  data?: Record<string, unknown>;
  citations?: string[];
}

export interface NoteSection {
  key: string;
  title: string;
  blocks: NoteBlock[];
}

export interface NoteDocument {
  topic: string;
  subject?: string;
  academic_context?: string;
  sections: NoteSection[];
  limitations?: string[];
  schema_version?: string;
}

/** Only http(s) links are ever opened. */
export function isSafeUrl(url: unknown): url is string {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

const BLOCK_LABEL: Record<string, string> = {
  definition: 'Definition',
  formula: 'Formula',
  example: 'Solved example',
  numerical: 'Solved numerical',
  mistake: 'Common mistake',
  callout: 'Note',
  diagram: 'Diagram',
};

export default function StructuredNoteViewer({
  document,
  onEditSection,
  onRegenerateSection,
}: {
  document: NoteDocument;
  onEditSection?: (sectionKey: string) => void;
  onRegenerateSection?: (sectionKey: string) => void;
}) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const [fontScale, setFontScale] = useState(1);
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});

  const sections = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return document.sections;
    return document.sections
      .map((section) => ({
        ...section,
        blocks: section.blocks.filter((block) =>
          JSON.stringify(block).toLowerCase().includes(needle),
        ),
      }))
      .filter((section) => section.blocks.length || section.title.toLowerCase().includes(needle));
  }, [document.sections, query]);

  const palette = dark
    ? { bg: '#12141a', fg: '#f2f4f8', muted: '#a8b0bf', card: '#1c1f27', accent: '#8aa4ff' }
    : { bg: '#ffffff', fg: '#14181f', muted: '#5b6472', card: '#f4f6fb', accent: '#3b5bdb' };
  const size = (base: number) => Math.round(base * fontScale);

  return (
    <ScrollView style={{ backgroundColor: palette.bg }} contentContainerStyle={styles.content}>
      <Text style={[styles.h1, { color: palette.fg, fontSize: size(26) }]}>{document.topic}</Text>
      {document.subject ? (
        <Text style={{ color: palette.muted, fontSize: size(13) }}>
          {document.subject}
          {document.academic_context ? ` · ${document.academic_context}` : ''}
        </Text>
      ) : null}

      <View style={styles.toolbar}>
        <TextInput
          style={[styles.search, { color: palette.fg, borderColor: palette.muted }]}
          placeholder="Search in notes"
          placeholderTextColor={palette.muted}
          value={query}
          onChangeText={setQuery}
          accessibilityLabel="Search inside notes"
        />
        <Pressable
          onPress={() => setFontScale((v) => Math.max(0.85, v - 0.1))}
          accessibilityLabel="Decrease font size"
        >
          <Text style={[styles.toolButton, { color: palette.accent }]}>A-</Text>
        </Pressable>
        <Pressable
          onPress={() => setFontScale((v) => Math.min(1.6, v + 0.1))}
          accessibilityLabel="Increase font size"
        >
          <Text style={[styles.toolButton, { color: palette.accent }]}>A+</Text>
        </Pressable>
      </View>

      <View style={[styles.toc, { backgroundColor: palette.card }]}>
        <Text style={[styles.tocTitle, { color: palette.fg, fontSize: size(15) }]}>Contents</Text>
        {document.sections.map((section, index) => (
          <Text key={section.key} style={{ color: palette.muted, fontSize: size(13) }}>
            {index + 1}. {section.title}
          </Text>
        ))}
      </View>

      {sections.map((section) => {
        const isCollapsed = collapsed[section.key];
        return (
          <View key={section.key} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Pressable
                style={styles.sectionTitleWrap}
                onPress={() => setCollapsed((c) => ({ ...c, [section.key]: !c[section.key] }))}
                accessibilityRole="button"
                accessibilityState={{ expanded: !isCollapsed }}
              >
                <Text style={[styles.h2, { color: palette.fg, fontSize: size(19) }]}>
                  {isCollapsed ? '▸' : '▾'} {section.title}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setBookmarks((b) => ({ ...b, [section.key]: !b[section.key] }))}
                accessibilityLabel={`Bookmark ${section.title}`}
              >
                <Text style={{ color: palette.accent }}>{bookmarks[section.key] ? '★' : '☆'}</Text>
              </Pressable>
            </View>

            {isCollapsed
              ? null
              : section.blocks.map((block, index) => (
                  <BlockView
                    key={`${section.key}-${index}`}
                    block={block}
                    palette={palette}
                    size={size}
                  />
                ))}

            {!isCollapsed && (onEditSection || onRegenerateSection) ? (
              <View style={styles.sectionActions}>
                {onEditSection ? (
                  <Pressable onPress={() => onEditSection(section.key)} accessibilityRole="button">
                    <Text style={{ color: palette.accent, fontSize: size(13) }}>Edit</Text>
                  </Pressable>
                ) : null}
                {onRegenerateSection ? (
                  <Pressable onPress={() => onRegenerateSection(section.key)} accessibilityRole="button">
                    <Text style={{ color: palette.accent, fontSize: size(13) }}>Regenerate</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}

      {document.limitations?.length ? (
        <View style={[styles.limitations, { backgroundColor: palette.card }]}>
          <Text style={[styles.h2, { color: palette.fg, fontSize: size(16) }]}>Research limitations</Text>
          {document.limitations.map((limitation, index) => (
            <Text key={index} style={{ color: palette.muted, fontSize: size(13) }}>
              • {limitation}
            </Text>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function BlockView({
  block,
  palette,
  size,
}: {
  block: NoteBlock;
  palette: { fg: string; muted: string; card: string; accent: string };
  size: (base: number) => number;
}) {
  const label = BLOCK_LABEL[block.kind];

  if (block.kind === 'table') {
    const headers = (block.data?.headers as string[]) ?? [];
    const rows = (block.items as string[][]) ?? [];
    return (
      <View style={[styles.block, { backgroundColor: palette.card }]}>
        {headers.length ? (
          <View style={styles.row}>
            {headers.map((header, index) => (
              <Text key={index} style={[styles.cellHead, { color: palette.fg, fontSize: size(13) }]}>
                {header}
              </Text>
            ))}
          </View>
        ) : null}
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((cell, cellIndex) => (
              <Text key={cellIndex} style={[styles.cell, { color: palette.fg, fontSize: size(13) }]}>
                {String(cell)}
              </Text>
            ))}
          </View>
        ))}
      </View>
    );
  }

  if (block.kind === 'source') {
    const url = block.data?.url;
    return (
      <View style={styles.sourceRow}>
        <Text style={{ color: palette.fg, fontSize: size(13) }}>{String(block.data?.title ?? '')}</Text>
        {isSafeUrl(url) ? (
          <Pressable onPress={() => void Linking.openURL(url)} accessibilityRole="link">
            <Text style={{ color: palette.accent, fontSize: size(12) }}>{url}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (block.kind === 'list') {
    return (
      <View style={styles.block}>
        {((block.items as string[]) ?? []).map((item, index) => (
          <Text key={index} style={{ color: palette.fg, fontSize: size(15), lineHeight: size(22) }}>
            • {String(item)}
          </Text>
        ))}
      </View>
    );
  }

  const boxed = ['definition', 'formula', 'example', 'numerical', 'mistake', 'callout', 'diagram'].includes(
    block.kind,
  );
  return (
    <View style={[styles.block, boxed && { backgroundColor: palette.card, borderLeftColor: palette.accent, borderLeftWidth: 3 }]}>
      {label ? (
        <Text style={{ color: palette.accent, fontSize: size(12), fontWeight: '700' }}>
          {String(block.data?.label ?? block.data?.title ?? label).toUpperCase()}
        </Text>
      ) : null}
      {block.text ? (
        <Text
          style={{
            color: palette.fg,
            fontSize: size(15),
            lineHeight: size(22),
            fontFamily: block.kind === 'formula' ? 'monospace' : undefined,
          }}
        >
          {block.text}
        </Text>
      ) : null}
      {block.citations?.length ? (
        <Text style={{ color: palette.muted, fontSize: size(11) }}>
          Sources: {block.citations.join(', ')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, gap: 12, paddingBottom: 60 },
  h1: { fontWeight: '700' },
  h2: { fontWeight: '700' },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  search: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  toolButton: { fontSize: 16, fontWeight: '700', paddingHorizontal: 6 },
  toc: { borderRadius: 12, padding: 14, gap: 4 },
  tocTitle: { fontWeight: '700', marginBottom: 4 },
  section: { gap: 8, marginTop: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitleWrap: { flex: 1 },
  sectionActions: { flexDirection: 'row', gap: 16, paddingTop: 4 },
  block: { borderRadius: 10, padding: 12, gap: 6 },
  row: { flexDirection: 'row', gap: 10 },
  cellHead: { flex: 1, fontWeight: '700' },
  cell: { flex: 1 },
  sourceRow: { paddingVertical: 4, gap: 2 },
  limitations: { borderRadius: 12, padding: 14, gap: 4, marginTop: 16 },
});
