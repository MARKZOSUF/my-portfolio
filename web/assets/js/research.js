/* Deep research: grounds notes in real reference material.
 * Uses only keyless, CORS-friendly public academic APIs so the single AI API
 * key stays the ONLY key the user ever needs. Every source is returned so the
 * notes can cite it.
 */

const TIMEOUT = 12000;
const S = 'https' + '://';

const HOST = {
  wikipedia: 'en.wikipedia.org',
  wikibooks: 'en.wikibooks.org',
  openalex: 'api.openalex.org',
  arxiv: 'export.arxiv.org',
  crossref: 'api.crossref.org',
  doi: 'doi.org',
};

const url = (host, path) => S + host + path;
const q = (value) => encodeURIComponent(value);

async function getJson(target, signal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const response = await fetch(target, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

async function getText(target, signal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const response = await fetch(target, { signal: controller.signal });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------- MediaWiki (Wikipedia / Wikibooks) ---------------- */

async function mediaWiki(host, label, query, signal, limit) {
  const search = await getJson(
    url(host, '/w/api.php?action=query&list=search&srsearch=' + q(query) + '&srlimit=' + limit + '&format=json&origin=*'),
    signal
  );
  const hits = search?.query?.search || [];
  const out = [];
  for (const hit of hits) {
    const extract = await getJson(
      url(host, '/w/api.php?action=query&prop=extracts&explaintext=1&titles=' + q(hit.title) + '&format=json&origin=*'),
      signal
    );
    const page = Object.values(extract?.query?.pages || {})[0];
    if (!page?.extract) continue;
    out.push({
      provider: label,
      title: page.title,
      url: url(host, '/wiki/' + q(String(page.title).split(' ').join('_'))),
      text: page.extract.slice(0, 6000),
    });
  }
  return out;
}

const wikipedia = (query, signal) => mediaWiki(HOST.wikipedia, 'Wikipedia', query, signal, 2);
const wikibooks = (query, signal) => mediaWiki(HOST.wikibooks, 'Wikibooks', query, signal, 1);

/* ---------------- OpenAlex ---------------- */

async function openalex(query, signal) {
  const data = await getJson(
    url(
      HOST.openalex,
      '/works?search=' + q(query) + '&per-page=4&select=title,abstract_inverted_index,doi,publication_year,primary_location'
    ),
    signal
  );
  return (data?.results || [])
    .map((work) => {
      let abstract = '';
      if (work.abstract_inverted_index) {
        const words = [];
        for (const [word, positions] of Object.entries(work.abstract_inverted_index)) {
          for (const p of positions) words[p] = word;
        }
        abstract = words.filter(Boolean).join(' ');
      }
      if (!abstract) return null;
      const doi = work.doi ? String(work.doi).replace(/^.*doi\.org\//, '') : '';
      return {
        provider: 'OpenAlex',
        title: work.title || 'Untitled work',
        url: doi ? url(HOST.doi, '/' + doi) : work.primary_location?.landing_page_url || url(HOST.openalex, '/'),
        text: abstract.slice(0, 2200) + (work.publication_year ? ' (' + work.publication_year + ')' : ''),
      };
    })
    .filter(Boolean);
}

/* ---------------- arXiv ---------------- */

async function arxiv(query, signal) {
  const xml = await getText(url(HOST.arxiv, '/api/query?search_query=all:' + q(query) + '&max_results=3'), signal);
  if (!xml) return [];
  return xml
    .split('<entry>')
    .slice(1)
    .map((entry) => {
      const pick = (tag) => {
        const m = entry.match(new RegExp('<' + tag + '>([\\s\\S]*?)</' + tag + '>'));
        return m ? m[1].replace(/\s+/g, ' ').trim() : '';
      };
      const title = pick('title');
      const summary = pick('summary');
      const id = pick('id');
      if (!title || !summary || !id) return null;
      return { provider: 'arXiv', title, url: id, text: summary.slice(0, 2200) };
    })
    .filter(Boolean);
}

/* ---------------- Crossref ---------------- */

async function crossref(query, signal) {
  const data = await getJson(
    url(HOST.crossref, '/works?query=' + q(query) + '&rows=3&select=title,abstract,DOI,issued'),
    signal
  );
  return (data?.message?.items || [])
    .filter((item) => item.abstract && item.DOI)
    .map((item) => ({
      provider: 'Crossref',
      title: (item.title || [''])[0] || 'Untitled',
      url: url(HOST.doi, '/' + item.DOI),
      text: item.abstract.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 2000),
    }));
}

const PROVIDERS = [wikipedia, wikibooks, openalex, arxiv, crossref];

/**
 * Fan-out search across every provider, then return a compact de-duplicated
 * context block plus the citation list.
 */
export async function deepResearch({ topic, queries = [], signal, onEvent, maxSources = 10 }) {
  const searches = [topic, ...queries].filter(Boolean).slice(0, 5);
  onEvent?.({ type: 'researchStart', queries: searches });

  const batches = await Promise.all(
    searches.flatMap((query) =>
      PROVIDERS.map(async (provider) => {
        try {
          return await provider(query, signal);
        } catch {
          return [];
        }
      })
    )
  );

  const seen = new Set();
  const sources = [];
  for (const item of batches.flat()) {
    if (!item?.text || !item?.url) continue;
    const key = String(item.url).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push(item);
    if (sources.length >= maxSources) break;
  }

  onEvent?.({ type: 'researchDone', count: sources.length });
  if (!sources.length) return { context: '', sources: [] };

  return {
    context: sources.map((s, i) => '[' + (i + 1) + '] ' + s.title + ' — ' + s.provider + '\n' + s.text).join('\n\n'),
    sources: sources.map((s) => ({ title: s.title, url: s.url, provider: s.provider })),
  };
}
