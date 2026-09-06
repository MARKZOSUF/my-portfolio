/* Notes generation engine.
 * Multi-pass pipeline: plan -> optional deep research -> parallel section
 * generation -> assembly. Each section is its own request so nothing gets
 * truncated, and a single failing section never destroys the whole lesson.
 */
import { chat, chatJson, parseLooseJson } from './ai.js';
import { getConfig } from './config.js';
import {
  SECTIONS,
  SECTION_BY_ID,
  CORE_SECTION_IDS,
  OPTIONAL_SECTION_IDS,
  PLANNER_PROMPT,
  scopeBlock,
  systemFor,
} from './prompts.js';
import { deepResearch } from './research.js';
import { clampSource } from './extract.js';
import { newId, putLesson } from './store.js';

export const DEFAULT_SECTION_IDS = [...CORE_SECTION_IDS];
export const ALL_SECTION_IDS = [...CORE_SECTION_IDS, ...OPTIONAL_SECTION_IDS];

const CONCURRENCY = { fast: 4, deep: 3, ultra: 2 };

/** Run async tasks with a bounded worker pool, preserving input order. */
async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

/**
 * Generate a full lesson.
 *
 * @param {object} input
 * @param {string} input.topic       what to study
 * @param {string} [input.sourceText] extracted PDF/DOCX/YouTube text
 * @param {string} [input.sourceLabel] human label for the source
 * @param {string[]} [input.sectionIds]
 * @param {boolean} [input.research]  run deep web research first
 * @param {string} [input.folderId]
 * @param {AbortSignal} [input.signal]
 * @param {(e:object)=>void} [input.onEvent] progress callbacks
 */
export async function generateLesson(input) {
  const cfg = getConfig();
  const emit = input.onEvent || (() => {});
  const signal = input.signal;
  const sectionIds = (input.sectionIds?.length ? input.sectionIds : DEFAULT_SECTION_IDS).filter(
    (id) => SECTION_BY_ID[id]
  );
  const sourceText = input.sourceText ? clampSource(input.sourceText) : '';
  const system = systemFor(cfg);

  const totalSteps = sectionIds.length + 1 + (input.research ? 1 : 0);
  let done = 0;
  const tick = (label) => {
    done += 1;
    emit({ type: 'progress', done, total: totalSteps, label });
  };

  /* ---- pass 1: plan ---- */
  emit({ type: 'stage', stage: 'plan', label: 'Understanding your topic…' });
  let plan = null;
  try {
    plan = await chatJson(
      [
        { role: 'system', content: 'You are a precise academic curriculum analyst. Return only JSON.' },
        { role: 'user', content: PLANNER_PROMPT(input.topic, sourceText) },
      ],
      { maxTokens: 1200, useFast: true, signal }
    );
  } catch (err) {
    emit({ type: 'warn', message: `Planner failed (${err.message}). Continuing with defaults.` });
  }
  if (!plan || typeof plan !== 'object') {
    plan = { title: input.topic, subject: '', level: 'undergraduate', unit: '', emoji: '📚', subtopics: [] };
  }
  plan.title = (plan.title || input.topic).trim();
  plan.emoji = plan.emoji || '📚';
  tick('Plan ready');
  emit({ type: 'plan', plan });

  /* ---- pass 2: deep research (optional) ---- */
  let research = '';
  let sources = [];
  if (input.research) {
    emit({ type: 'stage', stage: 'research', label: 'Deep-searching reference material…' });
    try {
      const found = await deepResearch({
        topic: plan.title,
        queries: plan.research_queries || [],
        signal,
        onEvent: emit,
      });
      research = found.context;
      sources = found.sources;
    } catch (err) {
      emit({ type: 'warn', message: `Research skipped: ${err.message}` });
    }
    tick('Research ready');
  }

  const ctx = { topic: plan.title, scope: scopeBlock(plan, sourceText, research) };

  /* ---- pass 3: sections in parallel ---- */
  emit({ type: 'stage', stage: 'sections', label: 'Writing your notes…' });
  const ordered = SECTIONS.filter((s) => sectionIds.includes(s.id));
  const limit = CONCURRENCY[cfg.quality] || 3;

  const generated = await pool(ordered, limit, async (section) => {
    emit({ type: 'sectionStart', id: section.id, title: section.title });
    try {
      if (section.json) {
        const data = await chatJson(
          [
            { role: 'system', content: `${system}\n\nReturn ONLY valid JSON. No prose, no code fences.` },
            { role: 'user', content: section.prompt(ctx) },
          ],
          { maxTokens: section.tokens, signal }
        );
        tick(section.title);
        emit({ type: 'sectionDone', id: section.id, title: section.title });
        return { id: section.id, title: section.title, icon: section.icon, kind: 'json', data };
      }
      const out = await chat(
        [
          { role: 'system', content: system },
          { role: 'user', content: section.prompt(ctx) },
        ],
        { maxTokens: section.tokens, temperature: 0.28, signal }
      );
      const markdown = cleanSection(out.text, section.title);
      tick(section.title);
      emit({ type: 'sectionDone', id: section.id, title: section.title, markdown });
      return { id: section.id, title: section.title, icon: section.icon, kind: 'markdown', markdown };
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      tick(section.title);
      emit({ type: 'sectionFailed', id: section.id, title: section.title, message: err.message });
      return {
        id: section.id,
        title: section.title,
        icon: section.icon,
        kind: 'markdown',
        failed: true,
        markdown: `## ${section.title}\n\n> This section could not be generated: ${err.message}\n>\n> Open the lesson and press **Regenerate** on this section to retry.`,
      };
    }
  });

  /* ---- assemble ---- */
  const lesson = {
    id: input.id || newId(),
    title: plan.title,
    emoji: plan.emoji,
    topic: input.topic,
    plan,
    sections: generated,
    sources,
    folderId: input.folderId || null,
    sourceLabel: input.sourceLabel || '',
    hasSource: Boolean(sourceText),
    sourceText: sourceText ? sourceText.slice(0, 60000) : '',
    config: { model: cfg.model, provider: cfg.providerLabel, quality: cfg.quality, language: cfg.language },
    createdAt: input.createdAt || Date.now(),
    openedAt: Date.now(),
    failedSections: generated.filter((s) => s.failed).map((s) => s.id),
  };

  await putLesson(lesson);
  emit({ type: 'done', lesson });
  return lesson;
}

/** Regenerate one section of an existing lesson. */
export async function regenerateSection(lesson, sectionId, { signal, onEvent } = {}) {
  const cfg = getConfig();
  const section = SECTION_BY_ID[sectionId];
  if (!section) throw new Error(`Unknown section: ${sectionId}`);
  const ctx = {
    topic: lesson.title,
    scope: scopeBlock(lesson.plan, lesson.sourceText, ''),
  };
  onEvent?.({ type: 'sectionStart', id: sectionId, title: section.title });
  const system = systemFor(cfg);

  let next;
  if (section.json) {
    const data = await chatJson(
      [
        { role: 'system', content: `${system}\n\nReturn ONLY valid JSON.` },
        { role: 'user', content: section.prompt(ctx) },
      ],
      { maxTokens: section.tokens, signal }
    );
    next = { id: sectionId, title: section.title, icon: section.icon, kind: 'json', data };
  } else {
    const out = await chat(
      [
        { role: 'system', content: system },
        { role: 'user', content: section.prompt(ctx) },
      ],
      { maxTokens: section.tokens, temperature: 0.3, signal }
    );
    next = {
      id: sectionId,
      title: section.title,
      icon: section.icon,
      kind: 'markdown',
      markdown: cleanSection(out.text, section.title),
    };
  }

  const sections = lesson.sections.some((s) => s.id === sectionId)
    ? lesson.sections.map((s) => (s.id === sectionId ? next : s))
    : [...lesson.sections, next];
  const updated = {
    ...lesson,
    sections,
    failedSections: sections.filter((s) => s.failed).map((s) => s.id),
  };
  await putLesson(updated);
  onEvent?.({ type: 'sectionDone', id: sectionId, title: section.title });
  return updated;
}

/** Add a section that was not part of the original generation. */
export async function addSection(lesson, sectionId, options) {
  return regenerateSection(lesson, sectionId, options || {});
}

/** Strip stray fences/preambles and guarantee the section heading exists. */
function cleanSection(text, title) {
  let value = (text || '').trim();
  value = value.replace(/^```(?:markdown|md)?\s*\n([\s\S]*)\n```$/i, '$1').trim();
  value = value.replace(/^(?:Sure|Certainly|Here (?:is|are)|Below is)[^\n]*\n+/i, '').trim();
  // Demote a leading H1 so the lesson keeps a single document title.
  value = value.replace(/^#\s+/, '## ');
  if (!/^#{2,3}\s/m.test(value)) value = `## ${title}\n\n${value}`;
  return value;
}

/** Flatten a lesson to a single Markdown document (for export / tutor context). */
export function lessonToMarkdown(lesson) {
  const head = [`# ${lesson.emoji || '📚'} ${lesson.title}`, ''];
  if (lesson.plan?.subject) {
    head.push(
      `**Subject:** ${lesson.plan.subject}${lesson.plan.unit ? ` — ${lesson.plan.unit}` : ''}  `,
      `**Level:** ${lesson.plan.level || 'undergraduate'}  `,
      `**Generated:** ${new Date(lesson.createdAt).toLocaleString()}  `,
      ''
    );
  }

  const body = lesson.sections
    .map((section) => {
      if (section.kind === 'markdown') return section.markdown;
      return `## ${section.title}\n\n${jsonSectionToMarkdown(section)}`;
    })
    .join('\n\n---\n\n');

  const refs = lesson.sources?.length
    ? `\n\n---\n\n## References\n\n${lesson.sources
        .map((s, i) => `${i + 1}. [${s.title || s.url}](${s.url})`)
        .join('\n')}`
    : '';

  return `${head.join('\n')}\n${body}${refs}\n`;
}

export function jsonSectionToMarkdown(section) {
  const data = section.data;
  if (!data) return '_No data._';
  if (section.id === 'flashcards' && Array.isArray(data.cards)) {
    return data.cards
      .map((c, i) => `**${i + 1}. ${c.front}**\n\n${c.back}\n\n_Tag: ${c.tag || 'concept'}_`)
      .join('\n\n');
  }
  if (section.id === 'quiz' && Array.isArray(data.questions)) {
    return data.questions
      .map((q, i) => {
        const opts = (q.options || [])
          .map((o, j) => `${'abcd'[j]}) ${o}`)
          .join('  \n');
        return `**Q${i + 1}.** ${q.q}\n\n${opts}\n\n**Ans:** ${'abcd'[q.answer] || '?'} — ${q.why || ''}`;
      })
      .join('\n\n');
  }
  if (section.id === 'mindmap' && data.root) {
    const lines = [`- **${data.root}**`];
    for (const child of data.children || []) {
      lines.push(`  - **${child.label}**${child.note ? ` — ${child.note}` : ''}`);
      for (const leaf of child.children || []) {
        lines.push(`    - ${leaf.label}${leaf.note ? ` — ${leaf.note}` : ''}`);
      }
    }
    return lines.join('\n');
  }
  return `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
}

export { parseLooseJson };
