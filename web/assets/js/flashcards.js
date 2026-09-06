/* Spaced-repetition flashcard drill. Uses store.schedule (SM-2 lite). */
import { schedule, getProgress, putProgress } from './store.js';

function pickArray(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  for (const key of ['cards', 'flashcards', 'items', 'data']) {
    if (Array.isArray(data[key])) return data[key];
  }
  return [];
}

export function normalizeCards(data) {
  return pickArray(data)
    .map((raw, index) => {
      if (!raw || typeof raw !== 'object') return null;
      const front = String(raw.front ?? raw.question ?? raw.term ?? raw.q ?? '').trim();
      const back = String(raw.back ?? raw.answer ?? raw.definition ?? raw.a ?? '').trim();
      if (!front || !back) return null;
      return { id: raw.id || `c${index + 1}`, front, back, hint: String(raw.hint ?? raw.mnemonic ?? '').trim() };
    })
    .filter(Boolean);
}

const GRADES = [
  { grade: 0, label: 'Again', kind: 'btn-danger' },
  { grade: 1, label: 'Hard', kind: 'btn-ghost' },
  { grade: 2, label: 'Good', kind: '' },
  { grade: 3, label: 'Easy', kind: 'btn-ghost' },
];

/** Render the flashcard drill into a container. */
export async function renderFlashcards(container, data, { lessonId } = {}) {
  const cards = normalizeCards(data);
  container.innerHTML = '';

  if (!cards.length) {
    container.innerHTML =
      '<div class="empty"><strong>No flashcards available</strong>Regenerate this section to try again.</div>';
    return;
  }

  const progressKey = `flashcards:${lessonId || 'default'}`;
  const saved = (await getProgress(progressKey)) || { cards: {} };
  const now = Date.now();

  const withState = cards.map((card) => ({
    ...card,
    state: saved.cards?.[card.id] || { reps: 0, ease: 2.5, interval: 0, due: now },
  }));

  let queue = withState.filter((c) => (c.state.due || 0) <= now);
  if (!queue.length) queue = [...withState];
  let index = 0;
  let flipped = false;
  let reviewed = 0;

  const stage = document.createElement('div');
  stage.className = 'flash-stage';
  container.appendChild(stage);

  function persist(card) {
    saved.cards = saved.cards || {};
    saved.cards[card.id] = card.state;
    return putProgress(progressKey, saved);
  }

  function draw() {
    if (index >= queue.length) {
      stage.innerHTML = `<div class="empty">
        <strong>Deck complete 🎉</strong>
        You reviewed ${reviewed} card${reviewed === 1 ? '' : 's'}. Come back later for the next scheduled round.
      </div>`;
      const again = document.createElement('button');
      again.type = 'button';
      again.className = 'btn btn-ghost btn-sm';
      again.style.marginTop = '12px';
      again.textContent = 'Review the whole deck again';
      again.addEventListener('click', () => {
        queue = [...withState];
        index = 0;
        reviewed = 0;
        flipped = false;
        draw();
      });
      stage.appendChild(again);
      return;
    }

    const card = queue[index];
    stage.innerHTML = '';

    const face = document.createElement('div');
    face.className = 'flash-card';
    face.tabIndex = 0;
    face.setAttribute('role', 'button');
    face.setAttribute('aria-label', 'Flip card');

    const label = document.createElement('div');
    label.className = 'side-label';
    label.textContent = flipped ? 'Answer' : 'Question';

    const body = document.createElement('div');
    body.textContent = flipped ? card.back : card.front;

    const wrap = document.createElement('div');
    wrap.append(label, body);
    if (!flipped && card.hint) {
      const hint = document.createElement('div');
      hint.style.cssText = 'margin-top:14px;font-size:14px;color:var(--muted)';
      hint.textContent = `Hint: ${card.hint}`;
      wrap.appendChild(hint);
    }
    face.appendChild(wrap);

    const flip = () => {
      flipped = !flipped;
      draw();
    };
    face.addEventListener('click', flip);
    face.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        flip();
      }
    });
    stage.appendChild(face);

    if (flipped) {
      const grades = document.createElement('div');
      grades.className = 'flash-grades';
      GRADES.forEach(({ grade, label: text, kind }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `btn btn-sm ${kind}`.trim();
        btn.textContent = text;
        btn.addEventListener('click', async () => {
          card.state = schedule(card.state, grade);
          reviewed += 1;
          await persist(card);
          if (grade === 0) queue.push(card);
          index += 1;
          flipped = false;
          draw();
        });
        grades.appendChild(btn);
      });
      stage.appendChild(grades);
    } else {
      const tip = document.createElement('div');
      tip.className = 'flash-meta';
      tip.innerHTML = '<span>Click the card or press Space to reveal the answer.</span>';
      stage.appendChild(tip);
    }

    const meta = document.createElement('div');
    meta.className = 'flash-meta';
    meta.innerHTML = `<span>Card ${index + 1} of ${queue.length}</span><span>Reviews: ${card.state.reps || 0}</span><span>Deck: ${withState.length} cards</span>`;
    stage.appendChild(meta);
  }

  draw();
}
