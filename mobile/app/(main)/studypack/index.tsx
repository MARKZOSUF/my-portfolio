/**
 * Turbo topic-to-notes screen.
 *
 * The entire required input is one topic. Everything academic (board, course,
 * semester, exam, language, depth) is optional and collapsed by default.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStudyPack, type StudentProfile } from '@/features/studypack/useStudyPack';

const EXAMPLE_TOPICS = [
  'Quantum Mechanics',
  'Matrices',
  'Thermodynamics',
  'Photosynthesis',
  'Data Structures',
  'Operating Systems',
  'Indian Constitution',
  'Class 10 Electricity',
];

const LANGUAGES: Array<{ key: NonNullable<StudentProfile['language']>; label: string }> = [
  { key: 'en', label: 'English' },
  { key: 'hi', label: 'हिन्दी' },
  { key: 'hinglish', label: 'Hinglish' },
];

const DEPTHS: Array<{ key: NonNullable<StudentProfile['explanation_depth']>; label: string }> = [
  { key: 'easy', label: 'Easy' },
  { key: 'standard', label: 'Standard academic' },
  { key: 'deep', label: 'Deep technical' },
];

export default function StudyPackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ topic?: string }>();
  const { state, stages, start, cancel, retry } = useStudyPack();
  const [topic, setTopic] = useState(params.topic ?? '');

  // Dashboard recommendations and deep links pass ?topic=... Adopt it without
  // clobbering whatever the student has since typed.
  useEffect(() => {
    if (params.topic) setTopic(params.topic);
  }, [params.topic]);
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState<StudentProfile>({});
  const [error, setError] = useState<string | null>(null);

  const busy = state.status === 'queued' || state.status === 'running';
  const currentStage = useMemo(() => {
    if (!stages.length) return state.stageLabel ?? '';
    const reached = stages.filter((s) => s.progress <= state.progress);
    return (reached[reached.length - 1] ?? stages[0]).label;
  }, [stages, state.progress, state.stageLabel]);

  const onGenerate = async () => {
    setError(null);
    try {
      await start(topic, Object.keys(profile).length ? profile : undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start research.');
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Deep research notes</Text>
      <Text style={styles.subtitle}>
        Enter a topic. Everything else is optional — a topic alone produces general,
        research-backed notes with citations.
      </Text>

      <TextInput
        style={styles.input}
        value={topic}
        onChangeText={setTopic}
        placeholder="e.g. Matrices, Thermodynamics, UPSC Polity"
        editable={!busy}
        accessibilityLabel="Topic"
        returnKeyType="go"
        onSubmitEditing={onGenerate}
      />

      <View style={styles.chips}>
        {EXAMPLE_TOPICS.map((example) => (
          <Pressable key={example} style={styles.chip} onPress={() => setTopic(example)} disabled={busy}>
            <Text style={styles.chipText}>{example}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        style={[styles.primary, (busy || topic.trim().length < 2) && styles.primaryDisabled]}
        onPress={onGenerate}
        disabled={busy || topic.trim().length < 2}
      >
        <Text style={styles.primaryText}>Deep Research &amp; Create Notes</Text>
      </Pressable>

      <Pressable onPress={() => setShowProfile((v) => !v)} accessibilityRole="button">
        <Text style={styles.toggle}>
          {showProfile ? '−' : '+'} Optional academic details (board, course, exam, language)
        </Text>
      </Pressable>

      {showProfile ? (
        <View style={styles.profile}>
          {([
            ['institution', 'School / college / university'],
            ['board', 'Board'],
            ['course', 'Course'],
            ['branch', 'Branch'],
            ['semester', 'Semester / class'],
            ['subject', 'Subject'],
            ['subject_code', 'Subject code'],
            ['syllabus_year', 'Syllabus year'],
            ['target_exam', 'Target examination'],
            ['exam_date', 'Examination date (YYYY-MM-DD)'],
          ] as Array<[keyof StudentProfile, string]>).map(([key, label]) => (
            <TextInput
              key={String(key)}
              style={styles.smallInput}
              placeholder={label}
              accessibilityLabel={label}
              value={(profile[key] as string) ?? ''}
              onChangeText={(value) => setProfile((p) => ({ ...p, [key]: value || undefined }))}
            />
          ))}
          <Text style={styles.groupLabel}>Language</Text>
          <View style={styles.chips}>
            {LANGUAGES.map((option) => (
              <Pressable
                key={option.key}
                style={[styles.chip, profile.language === option.key && styles.chipActive]}
                onPress={() => setProfile((p) => ({ ...p, language: option.key }))}
              >
                <Text style={styles.chipText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.groupLabel}>Explanation depth</Text>
          <View style={styles.chips}>
            {DEPTHS.map((option) => (
              <Pressable
                key={option.key}
                style={[styles.chip, profile.explanation_depth === option.key && styles.chipActive]}
                onPress={() => setProfile((p) => ({ ...p, explanation_depth: option.key }))}
              >
                <Text style={styles.chipText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {busy ? (
        <View style={styles.progressCard}>
          <ActivityIndicator />
          <Text style={styles.stage}>{currentStage}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round((state.progress || 0) * 100)}%` }]} />
          </View>
          <Text style={styles.hint}>
            You can close the app. Research continues on the server and this screen resumes
            where it left off.
          </Text>
          <Pressable onPress={() => void cancel()} accessibilityRole="button">
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      {state.status === 'failed' ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>Research failed: {state.errorCode ?? 'unknown error'}</Text>
          <Pressable onPress={() => void retry()} accessibilityRole="button">
            <Text style={styles.cancel}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {state.status === 'succeeded' && state.result ? (
        <View style={styles.doneCard}>
          <Text style={styles.doneTitle}>{state.result.topic}</Text>
          <Text style={styles.doneMeta}>
            {state.result.subject} · {state.result.academic_context} ·{' '}
            {state.result.citation_count} citations
          </Text>
          <Pressable
            style={styles.primary}
            onPress={() => router.push(`/notes/${state.result?.note_id}`)}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>Open notes</Text>
          </Pressable>
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { fontSize: 15, opacity: 0.75, lineHeight: 21 },
  input: { borderWidth: 1, borderColor: '#c9cfd8', borderRadius: 12, padding: 14, fontSize: 17 },
  smallInput: { borderWidth: 1, borderColor: '#d7dbe2', borderRadius: 10, padding: 10, fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#d7dbe2', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { backgroundColor: '#e5edff', borderColor: '#3b5bdb' },
  chipText: { fontSize: 13 },
  primary: { backgroundColor: '#3b5bdb', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  primaryDisabled: { opacity: 0.45 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  toggle: { color: '#3b5bdb', fontSize: 14, paddingVertical: 6 },
  profile: { gap: 8 },
  groupLabel: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  progressCard: { gap: 10, padding: 16, borderRadius: 12, backgroundColor: '#f4f6fb' },
  stage: { fontSize: 15, fontWeight: '600' },
  track: { height: 8, borderRadius: 4, backgroundColor: '#dde3ef', overflow: 'hidden' },
  fill: { height: 8, backgroundColor: '#3b5bdb' },
  hint: { fontSize: 12, opacity: 0.7 },
  cancel: { color: '#c92a2a', fontSize: 14, fontWeight: '600' },
  errorCard: { gap: 8, padding: 14, borderRadius: 12, backgroundColor: '#fff5f5' },
  errorText: { color: '#c92a2a', fontSize: 14 },
  doneCard: { gap: 10, padding: 16, borderRadius: 12, backgroundColor: '#ebfbee' },
  doneTitle: { fontSize: 18, fontWeight: '700' },
  doneMeta: { fontSize: 13, opacity: 0.75 },
});
