/* Interactive quiz renderer. Tolerant of small shape differences in AI JSON. */
import { renderInto } from './render.js';

function pickArray(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  for (const key of ['questions', 'items', 'quiz', 'mcqs', 'data']) {
    if (Array.isArray(data[key])) return data[key];
  }
  return [];
}

function letterToIndex(value) {
  const letter = String(value).trim().toLowerCase();
  if (/^[a-h]$/.test(letter)) return letter.charCodeAt(0) - 97;
  return -1;
}

/** Normalise one question into { stem, options[], answer, why, marks, type }. */
export function normalizeQuestion(raw, index) {
  if (!raw || typeof raw !== 'object') return null;
  const stem = String(raw.question ?? raw.stem ?? raw.q ?? raw.prompt ?? '').trim();
  if (!stem) return null;

  let options = raw.options ?? raw.choices ?? raw.answers ?? [];
  if (!Array.isArray(options)) {
    options = typeof options === 'object' ? Object.values(options) : [];
  }
  options = options.map((opt) => {
    if (opt && typeof opt === 'object') return String(opt.text ?? opt.label ?? opt.option ?? '').trim();
    return String(opt ?? '').trim();
  }).filter(Boolean);

  const rawAnswer = raw.answer ?? raw.correct ?? raw.correct_answer ?? raw.correctIndex ?? raw.correct_option;
  let answer = -1;
  if (typeof rawAnswer === 'number' && Number.isFinite(rawAnswer)) {
    answer = rawAnswer >= 1 && rawAnswer > options.length - 1 ? rawAnswer - 1 : rawAnswer;
  } else if (typeof rawAnswer === 'string') {
    const byLetter = letterToIndex(rawAnswer);
    const byText = options.findIndex((opt) => opt.toLowerCase() === rawAnswer.trim().toLowerCase());
    answer = byText >= 0 ? byText : byLetter;
  } else if (Array.isArray(rawAnswer)) {
    answer = typeof rawAnswer[0] === 'number' ? rawAnswer[0] : letterToIndex(rawAnswer[0]);
  }
  if (answer < 0 || answer >= options.length) {
    const flagged = (raw.options || []).findIndex?.((opt) => opt && typeof opt === 'object' && (opt.correct || opt.is_correct));
    answer = flagged >= 0 ? flagged : 0;
  }

  return {
    id: raw.id || `q${index + 1}`,
    stem,
    options,
    answer,
    why: String(raw.explanation ?? raw.why ?? raw.reason ?? raw.solution ?? '').trim(),
    marks: raw.marks ?? null,
    difficulty: raw.difficulty ?? raw.level ?? '',
  };
}

export function normalizeQuiz(data) {
  return pickArray(data)
    .map((raw, i) => normalizeQuestion(raw, i))
    .filter((q) => q && q.options.length >= 2);
}

const LETTERS = 'ABCDEFGH';

/**
 * Render an interactive quiz into a container element.
 * @returns {{ score: () => number }}
 */
export function renderQuiz(container, data) {
  const questions = normalizeQuiz(data);
  container.innerHTML = '';

  if (!questions.length) {
    container.innerHTML =
      '<div class="empty"><strong>No quiz questions available</strong>Regenerate this section to try again.</div>';
    return { score: () => 0 };
  }

  const answered = new Map();

  const scoreEl = document.createElement('div');
  scoreEl.className = 'quiz-score';
  scoreEl.setAttribute('role', 'status');
  const updateScore = () => {
    const correct = Array.from(answered.values()).filter(Boolean).length;
    scoreEl.textContent = `Score: ${correct} / ${questions.length} · ${answered.size} of ${questions.length} attempted`;
  };
  updateScore();
  container.appendChild(scoreEl);

  questions.forEach((q, qi) => {
    const card = document.createElement('section');
    card.className = 'quiz-q';

    const stem = document.createElement('div');
    stem.className = 'stem';
    const meta = [q.marks ? `${q.marks} marks` : '', q.difficulty].filter(Boolean).join(' · ');
    stem.textContent = `${qi + 1}. ${q.stem}${meta ? `  (${meta})` : ''}`;
    card.appendChild(stem);

    const why = document.createElement('div');
    why.className = 'quiz-why';
    why.hidden = true;

    const buttons = q.options.map((text, oi) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-opt';
      const letter = document.createElement('span');
      letter.className = 'letter';
      letter.textContent = LETTERS[oi] || String(oi + 1);
      const label = document.createElement('span');
      label.textContent = text;
      btn.append(letter, label);
      btn.addEventListener('click', () => {
        if (answered.has(q.id)) return;
        answered.set(q.id, oi === q.answer);
        buttons.forEach((b, bi) => {
          if (bi === q.answer) b.classList.add('correct');
          else if (bi === oi) b.classList.add('wrong');
          b.setAttribute('aria-disabled', 'true');
        });
        if (q.why) {
          renderInto(why, `**${oi === q.answer ? 'Correct.' : `Correct answer: ${LETTERS[q.answer]}.`}** ${q.why}`);
          why.hidden = false;
        }
        updateScore();
      });
      card.appendChild(btn);
      return btn;
    });

    card.appendChild(why);
    container.appendChild(card);
  });

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'btn btn-ghost btn-sm';
  reset.textContent = 'Reset quiz';
  reset.addEventListener('click', () => renderQuiz(container, data));
  container.appendChild(reset);

  return { score: () => Array.from(answered.values()).filter(Boolean).length };
}
