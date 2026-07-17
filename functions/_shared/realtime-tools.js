const DEFAULT_TIMEOUT_MS = 9000;
const MAX_SOURCES = 18;
const MAX_CONTEXT_CHARS = 30000;

const SERVICE_CATALOG = [
  { id: "auto", name: "Auto Router", free: true, description: "Automatically chooses live services from the question." },
  { id: "weather", name: "Weather", free: true, description: "Current weather and 5-day forecast through Open-Meteo." },
  { id: "time", name: "World Time", free: true, description: "Current local time for a city using geocoding timezone data." },
  { id: "currency", name: "Currency", free: true, description: "Current reference exchange rates through Frankfurter." },
  { id: "crypto", name: "Crypto Price", free: true, description: "Current cryptocurrency reference rates through Coinbase public data." },
  { id: "news", name: "Live News", free: true, description: "Recent global news discovery through GDELT." },
  { id: "wikipedia", name: "Wikipedia", free: true, description: "Searches Wikipedia summaries and source pages." },
  { id: "academic", name: "Research Papers", free: true, description: "Crossref scholarly metadata and citations." },
  { id: "arxiv", name: "arXiv", free: true, description: "Searches recent and relevant arXiv e-prints." },
  { id: "github", name: "GitHub", free: true, description: "Public repositories, metadata and latest releases." },
  { id: "stackoverflow", name: "Stack Overflow", free: true, description: "Relevant programming questions through Stack Exchange." },
  { id: "npm", name: "npm Registry", free: true, description: "Package versions, metadata and package search." },
  { id: "pypi", name: "PyPI", free: true, description: "Python package metadata and latest releases." },
  { id: "hackernews", name: "Hacker News", free: true, description: "Near-real-time top technology stories." },
  { id: "url", name: "URL Reader", free: true, description: "Reads a safe public HTTPS article or documentation page." },
  { id: "rss", name: "RSS Reader", free: true, description: "Reads a safe public RSS or Atom feed." },
  { id: "web", name: "Open Web Search", free: false, description: "Uses Brave, Tavily or Serper when a key is configured; otherwise uses public-source discovery." }
];

const RESTRICTED_QUERY = /\b(?:buy|make|build|hide|smuggle|dose|dealer|bet|casino|odds|weapon|gun|firearm|ammo|bomb|explosive|switchblade|taser|pepper\s*spray|vape|cigarette|nicotine|marijuana|cannabis|cocaine|heroin|meth|porn|explicit\s*sex)\b/i;
const SELF_HARM_QUERY = /\b(?:suicide|self[- ]?harm|kill myself|hurt myself)\b/i;

const WEATHER_WORDS = /\b(?:weather|forecast|temperature|rain|raining|mausam|barish|garmi|sardi|humidity|wind)\b/i;
const TIME_WORDS = /\b(?:current time|local time|time in|what time|kitne baje|samay)\b/i;
const CURRENCY_WORDS = /\b(?:exchange rate|currency|convert|conversion|usd|inr|eur|gbp|jpy|cad|aud|chf|rupee|dollar|euro|pound)\b/i;
const CRYPTO_WORDS = /\b(?:bitcoin|btc|ethereum|eth|solana|sol|dogecoin|doge|crypto|cryptocurrency)\b/i;
const NEWS_WORDS = /\b(?:latest news|breaking news|today'?s news|current news|news about|khabar|samachar|headlines)\b/i;
const ACADEMIC_WORDS = /\b(?:research paper|paper about|academic|study about|doi|crossref|journal|citation|arxiv|peer[- ]reviewed)\b/i;
const CODE_WORDS = /\b(?:github|repository|repo\b|stackoverflow|stack overflow|npm\b|pypi|python package|javascript package|latest release|library version)\b/i;
const HN_WORDS = /\b(?:hacker news|tech headlines|startup news|developer news)\b/i;
const WIKI_WORDS = /\b(?:wikipedia|encyclopedia|who is|what is|kya hai|history of|overview of)\b/i;
const URL_PATTERN = /https:\/\/[^\s<>"')\]]+/i;

export function listRealtimeServices() {
  return SERVICE_CATALOG;
}

export function realtimeCapabilities(env = {}) {
  return {
    automaticTools: true,
    noKeyServices: SERVICE_CATALOG.filter(item => item.free).map(item => item.id),
    optionalSearchProviders: {
      brave: Boolean(env.BRAVE_SEARCH_API_KEY),
      tavily: Boolean(env.TAVILY_API_KEY),
      serper: Boolean(env.SERPER_API_KEY)
    },
    githubAuthenticated: Boolean(env.GITHUB_TOKEN),
    urlReaderAllowlist: Boolean(env.URL_READER_ALLOWED_HOSTS)
  };
}

export async function collectRealtimeContext({ query, env, request, domainFocus = "web", researchMode = "off", enabled = true }) {
  if (!enabled || !query) return { context: "", sources: [], tools: [] };
  assertSafeRealtimeQuery(query);

  const tools = detectTools(query, domainFocus, researchMode);
  if (!tools.length) return { context: "", sources: [], tools: [] };

  const jobs = tools.slice(0, researchMode === "deep" ? 5 : 3).map(tool =>
    runRealtimeTool(tool, { query }, { env, request }).catch(error => ({
      tool,
      title: `${tool} unavailable`,
      summary: error.message,
      data: null,
      sources: [],
      fetchedAt: new Date().toISOString(),
      error: true
    }))
  );

  const results = await Promise.all(jobs);
  const successful = results.filter(item => item && !item.error && (item.summary || item.data));
  const sources = dedupeSources(successful.flatMap(item => item.sources || [])).slice(0, MAX_SOURCES);
  const sourceIndex = new Map(sources.map((source, index) => [source.url, index + 1]));

  const blocks = successful.map(item => {
    const refs = (item.sources || [])
      .map(source => sourceIndex.get(source.url))
      .filter(Boolean)
      .map(number => `[${number}]`)
      .join(" ");
    return `LIVE TOOL: ${item.title}
Fetched: ${item.fetchedAt}
${item.summary || ""}
${serializeData(item.data)}
Sources: ${refs || "none"}`.trim();
  });

  const context = blocks.length
    ? `Real-time external service results follow. Treat them as time-sensitive data, cite their numbered sources, distinguish live data from model knowledge, and mention the retrieval time when relevant.

${blocks.join("\n\n---\n\n")}`.slice(0, MAX_CONTEXT_CHARS)
    : "";

  return { context, sources: sources.map((item, index) => ({ index: index + 1, ...item })), tools: successful.map(item => item.tool), results: successful };
}

export async function publicSearch(query, domainFocus, env, request, count = 8) {
  assertSafeRealtimeQuery(query);
  const paid = await paidSearch(query, domainFocus, env, count).catch(() => null);
  if (paid?.sources?.length) return paid;

  if (domainFocus === "youtube" || domainFocus === "reddit") {
    return {
      context: `A configured Brave, Tavily or Serper key is required for ${domainFocus} discovery. No ${domainFocus} results were retrieved.`,
      sources: []
    };
  }

  const preferred = domainFocus === "academic"
    ? ["academic", "arxiv"]
    : domainFocus === "code"
      ? ["github", "stackoverflow", "npm"]
      : domainFocus === "youtube"
        ? ["news", "wikipedia"]
        : domainFocus === "reddit"
          ? ["news", "wikipedia"]
          : ["wikipedia", "news"];

  const groups = await Promise.all(preferred.map(tool =>
    runRealtimeTool(tool, { query }, { env, request }).catch(() => null)
  ));

  const sources = dedupeSources(groups.filter(Boolean).flatMap(group => group.sources || [])).slice(0, count);
  return sourceContext(sources);
}

export async function runRealtimeTool(tool, args = {}, { env = {}, request } = {}) {
  const id = String(tool || "auto").toLowerCase();
  const query = clean(args.query || "", 1200);
  assertSafeRealtimeQuery(query);

  if (id === "auto") {
    const detected = detectTools(query, args.domainFocus || "web", args.researchMode || "standard");
    const results = [];
    for (const selected of detected.slice(0, 4)) {
      results.push(await runRealtimeTool(selected, args, { env, request }));
    }
    return {
      tool: "auto",
      title: "Automatic live service results",
      summary: `Used ${results.map(item => item.title).join(", ")}.`,
      data: results.map(item => ({ tool: item.tool, title: item.title, summary: item.summary, data: item.data })),
      sources: dedupeSources(results.flatMap(item => item.sources || [])),
      fetchedAt: new Date().toISOString()
    };
  }

  const handlers = {
    weather: weatherTool,
    time: timeTool,
    currency: currencyTool,
    crypto: cryptoTool,
    news: newsTool,
    wikipedia: wikipediaTool,
    academic: academicTool,
    arxiv: arxivTool,
    github: githubTool,
    stackoverflow: stackOverflowTool,
    npm: npmTool,
    pypi: pypiTool,
    hackernews: hackerNewsTool,
    url: urlTool,
    rss: rssTool,
    web: webTool
  };

  const handler = handlers[id];
  if (!handler) throw new Error(`Unknown live tool: ${id}`);
  return handler({ ...args, query }, { env, request });
}

function detectTools(query, domainFocus, researchMode) {
  const tools = [];
  const url = query.match(URL_PATTERN)?.[0];
  if (url) tools.push("url");
  if (WEATHER_WORDS.test(query)) tools.push("weather");
  if (TIME_WORDS.test(query)) tools.push("time");
  if (CURRENCY_WORDS.test(query)) tools.push("currency");
  if (CRYPTO_WORDS.test(query)) tools.push("crypto");
  if (NEWS_WORDS.test(query)) tools.push("news");
  if (HN_WORDS.test(query)) tools.push("hackernews");
  if (ACADEMIC_WORDS.test(query) || domainFocus === "academic") tools.push("academic", "arxiv");
  if (CODE_WORDS.test(query) || domainFocus === "code") {
    if (/\bnpm\b|javascript package/i.test(query)) tools.push("npm");
    if (/\bpypi\b|python package/i.test(query)) tools.push("pypi");
    if (/stack\s*overflow|error|exception|traceback/i.test(query)) tools.push("stackoverflow");
    tools.push("github");
  }
  if (WIKI_WORDS.test(query) && tools.length < 3) tools.push("wikipedia");

  if (!tools.length && researchMode !== "off") {
    tools.push(domainFocus === "academic" ? "academic" : domainFocus === "code" ? "github" : "wikipedia");
    if (researchMode === "deep") tools.push(domainFocus === "academic" ? "arxiv" : "news");
  }

  return [...new Set(tools)];
}

async function weatherTool(args) {
  const location = extractLocation(args.query, args.location);
  if (!location) throw new Error("Add a city, for example: weather in Aligarh.");
  const place = await geocode(location);
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", place.latitude);
  url.searchParams.set("longitude", place.longitude);
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,cloud_cover,wind_speed_10m");
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "5");
  const data = await fetchJson(url);
  const current = data.current || {};
  const days = (data.daily?.time || []).map((date, index) => ({
    date,
    condition: weatherCode(data.daily.weather_code?.[index]),
    maxC: data.daily.temperature_2m_max?.[index],
    minC: data.daily.temperature_2m_min?.[index],
    rainChance: data.daily.precipitation_probability_max?.[index]
  }));
  return result("weather", `Weather for ${place.name}, ${place.country}`, `${weatherCode(current.weather_code)}; ${current.temperature_2m}°C, feels like ${current.apparent_temperature}°C, humidity ${current.relative_humidity_2m}%, wind ${current.wind_speed_10m} km/h.`, { place, current, forecast: days }, [
    source("Open-Meteo forecast", url.toString(), "Live weather forecast and current conditions."),
    source("Open-Meteo geocoding", place.geocodeUrl, "Location and timezone lookup.")
  ]);
}

async function timeTool(args) {
  const location = extractLocation(args.query, args.location);
  if (!location) throw new Error("Add a city, for example: current time in Tokyo.");
  const place = await geocode(location);
  const now = new Date();
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: place.timezone,
    dateStyle: "full",
    timeStyle: "long"
  }).format(now);
  return result("time", `Local time in ${place.name}`, formatted, { place, isoFetchedAt: now.toISOString(), localTime: formatted }, [
    source("Open-Meteo geocoding", place.geocodeUrl, "Timezone lookup for the requested city.")
  ]);
}

async function currencyTool(args) {
  const parsed = parseCurrency(args.query, args);
  const url = new URL("https://api.frankfurter.dev/v1/latest");
  url.searchParams.set("base", parsed.from);
  url.searchParams.set("symbols", parsed.to);
  const data = await fetchJson(url);
  const rate = Number(data.rates?.[parsed.to]);
  if (!Number.isFinite(rate)) throw new Error(`No exchange rate returned for ${parsed.from}/${parsed.to}.`);
  const converted = parsed.amount * rate;
  return result("currency", `${parsed.from} to ${parsed.to}`, `${parsed.amount} ${parsed.from} ≈ ${formatNumber(converted)} ${parsed.to}. Reference rate: 1 ${parsed.from} = ${formatNumber(rate)} ${parsed.to}.`, {
    amount: parsed.amount,
    from: parsed.from,
    to: parsed.to,
    rate,
    converted,
    rateDate: data.date
  }, [source("Frankfurter exchange rates", url.toString(), "Central-bank reference exchange-rate data.")]);
}

async function cryptoTool(args) {
  const parsed = parseCrypto(args.query, args);
  const url = `https://api.coinbase.com/v2/exchange-rates?currency=${encodeURIComponent(parsed.asset)}`;
  const data = await fetchJson(url);
  const rate = Number(data.data?.rates?.[parsed.quote]);
  if (!Number.isFinite(rate)) throw new Error(`No ${parsed.asset}/${parsed.quote} rate returned.`);
  return result("crypto", `${parsed.asset} reference price`, `1 ${parsed.asset} ≈ ${formatNumber(rate)} ${parsed.quote}. Crypto prices can move rapidly.`, {
    asset: parsed.asset,
    quote: parsed.quote,
    rate
  }, [source("Coinbase public exchange rates", url, "Current public cryptocurrency reference-rate endpoint.")]);
}

async function newsTool(args) {
  const query = clean(args.query.replace(NEWS_WORDS, " "), 300) || "world";
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set("query", query);
  url.searchParams.set("mode", "ArtList");
  url.searchParams.set("maxrecords", String(Math.min(20, Number(args.limit) || 10)));
  url.searchParams.set("format", "json");
  url.searchParams.set("sort", "HybridRel");
  url.searchParams.set("timespan", args.timespan || "24h");
  const data = await fetchJson(url);
  const articles = (data.articles || []).slice(0, 10).map(item => ({
    title: clean(item.title, 240),
    url: item.url,
    source: item.domain || item.sourcecountry || "",
    language: item.language || "",
    published: item.seendate || ""
  })).filter(item => item.title && safeHttpUrl(item.url));
  return result("news", `Recent news: ${query}`, articles.length ? `Found ${articles.length} recent articles from the last ${args.timespan || "24 hours"}.` : "No recent articles were returned.", articles, articles.map(item => source(item.title, item.url, `${item.source} ${item.published}`.trim())));
}

async function wikipediaTool(args) {
  const query = clean(args.query.replace(WIKI_WORDS, " "), 300) || clean(args.query, 300);
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", query);
  url.searchParams.set("gsrlimit", "5");
  url.searchParams.set("prop", "extracts|info");
  url.searchParams.set("exintro", "1");
  url.searchParams.set("explaintext", "1");
  url.searchParams.set("inprop", "url");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  const data = await fetchJson(url);
  const pages = Object.values(data.query?.pages || {}).sort((a, b) => (a.index || 999) - (b.index || 999)).map(page => ({
    title: page.title,
    summary: clean(page.extract, 1200),
    url: page.fullurl
  })).filter(page => page.title && page.url);
  return result("wikipedia", `Wikipedia: ${query}`, pages[0]?.summary || "No Wikipedia summary was returned.", pages, pages.map(page => source(page.title, page.url, page.summary.slice(0, 240))));
}

async function academicTool(args) {
  const query = clean(args.query.replace(ACADEMIC_WORDS, " "), 300) || clean(args.query, 300);
  const url = new URL("https://api.crossref.org/works");
  url.searchParams.set("query.bibliographic", query);
  url.searchParams.set("rows", String(Math.min(10, Number(args.limit) || 6)));
  url.searchParams.set("select", "DOI,title,author,published,URL,is-referenced-by-count,publisher,type");
  const headers = { "User-Agent": `MARKZOSUF-AI-NEXUS/11 (${args.contactEmail || "public-research-tool"})` };
  const data = await fetchJson(url, { headers });
  const works = (data.message?.items || []).map(item => ({
    title: item.title?.[0] || "Untitled",
    doi: item.DOI || "",
    url: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : ""),
    authors: (item.author || []).slice(0, 5).map(author => [author.given, author.family].filter(Boolean).join(" ")).join(", "),
    year: item.published?.["date-parts"]?.[0]?.[0] || null,
    citations: item["is-referenced-by-count"] || 0,
    publisher: item.publisher || "",
    type: item.type || ""
  })).filter(item => item.url);
  return result("academic", `Scholarly works: ${query}`, works.length ? `Found ${works.length} scholarly records. Citation counts are metadata, not a quality guarantee.` : "No scholarly records were returned.", works, works.map(item => source(item.title, item.url, `${item.authors} (${item.year || "date unknown"})`.trim())));
}

async function arxivTool(args) {
  const query = clean(args.query.replace(ACADEMIC_WORDS, " "), 240) || clean(args.query, 240);
  const url = new URL("https://export.arxiv.org/api/query");
  url.searchParams.set("search_query", `all:${query}`);
  url.searchParams.set("start", "0");
  url.searchParams.set("max_results", String(Math.min(10, Number(args.limit) || 5)));
  url.searchParams.set("sortBy", "relevance");
  url.searchParams.set("sortOrder", "descending");
  const response = await fetchWithTimeout(url, { headers: { "User-Agent": "MARKZOSUF-AI-NEXUS/11" } });
  if (!response.ok) throw new Error(`arXiv request failed (${response.status}).`);
  const xml = await response.text();
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(match => {
    const block = match[1];
    return {
      title: decodeXml(tag(block, "title")).replace(/\s+/g, " ").trim(),
      summary: decodeXml(tag(block, "summary")).replace(/\s+/g, " ").trim().slice(0, 900),
      url: decodeXml(tag(block, "id")),
      published: decodeXml(tag(block, "published")),
      authors: [...block.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>\s*<\/author>/g)].map(x => decodeXml(x[1])).slice(0, 6)
    };
  }).filter(item => item.title && item.url);
  return result("arxiv", `arXiv: ${query}`, entries.length ? `Found ${entries.length} relevant e-prints.` : "No arXiv e-prints were returned.", entries, entries.map(item => source(item.title, item.url, `${item.authors.join(", ")} ${item.published}`.trim())));
}

async function githubTool(args, { env }) {
  const query = clean(args.query.replace(/\bgithub\b|repository|repo\b|latest release/gi, " "), 300) || clean(args.query, 300);
  const exact = query.match(/\b([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\b/);
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "MARKZOSUF-AI-NEXUS",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;

  if (exact) {
    const fullName = `${exact[1]}/${exact[2]}`;
    const repoUrl = `https://api.github.com/repos/${fullName}`;
    const [repo, release] = await Promise.all([
      fetchJson(repoUrl, { headers }),
      fetchJson(`${repoUrl}/releases/latest`, { headers }).catch(() => null)
    ]);
    const data = {
      fullName: repo.full_name,
      description: repo.description,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
      language: repo.language,
      license: repo.license?.spdx_id || "",
      updatedAt: repo.updated_at,
      defaultBranch: repo.default_branch,
      latestRelease: release ? { name: release.name || release.tag_name, tag: release.tag_name, publishedAt: release.published_at, url: release.html_url } : null
    };
    const sources = [source(repo.full_name, repo.html_url, repo.description || "GitHub repository")];
    if (release?.html_url) sources.push(source(`Latest release ${release.tag_name}`, release.html_url, release.name || ""));
    return result("github", repo.full_name, `${repo.description || "Public GitHub repository."} ${repo.stargazers_count} stars; updated ${repo.updated_at}.`, data, sources);
  }

  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", query);
  url.searchParams.set("sort", "stars");
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", String(Math.min(10, Number(args.limit) || 6)));
  const data = await fetchJson(url, { headers });
  const repos = (data.items || []).map(repo => ({
    fullName: repo.full_name,
    description: repo.description || "",
    url: repo.html_url,
    stars: repo.stargazers_count,
    language: repo.language,
    updatedAt: repo.updated_at
  }));
  return result("github", `GitHub repositories: ${query}`, `Found ${repos.length} public repositories.`, repos, repos.map(repo => source(repo.fullName, repo.url, repo.description)));
}

async function stackOverflowTool(args) {
  const query = clean(args.query.replace(/stack\s*overflow/gi, " "), 300) || clean(args.query, 300);
  const url = new URL("https://api.stackexchange.com/2.3/search/advanced");
  url.searchParams.set("order", "desc");
  url.searchParams.set("sort", "relevance");
  url.searchParams.set("q", query);
  url.searchParams.set("site", "stackoverflow");
  url.searchParams.set("pagesize", String(Math.min(10, Number(args.limit) || 6)));
  const data = await fetchJson(url);
  const questions = (data.items || []).map(item => ({
    title: decodeHtml(item.title),
    url: item.link,
    score: item.score,
    answers: item.answer_count,
    accepted: item.is_answered,
    tags: item.tags || [],
    updatedAt: new Date((item.last_activity_date || 0) * 1000).toISOString()
  }));
  return result("stackoverflow", `Stack Overflow: ${query}`, `Found ${questions.length} relevant questions.`, questions, questions.map(item => source(item.title, item.url, `${item.answers} answers; score ${item.score}`)));
}

async function npmTool(args) {
  const parsed = extractPackage(args.query, args.package, "npm");
  if (parsed.exact) {
    const url = `https://registry.npmjs.org/${encodeURIComponent(parsed.name)}`;
    const data = await fetchJson(url);
    const latest = data["dist-tags"]?.latest || "";
    const current = data.versions?.[latest] || {};
    const info = {
      name: data.name,
      latest,
      description: data.description || current.description || "",
      license: current.license || data.license || "",
      homepage: current.homepage || data.homepage || "",
      repository: normalizeRepository(current.repository || data.repository),
      dependencies: Object.keys(current.dependencies || {}).length,
      publishedAt: data.time?.[latest] || ""
    };
    const page = `https://www.npmjs.com/package/${encodeURIComponent(data.name)}`;
    return result("npm", `npm: ${data.name}`, `${data.name} latest version is ${latest}. ${info.description}`, info, [source(`npm package ${data.name}`, page, info.description)]);
  }
  const url = new URL("https://registry.npmjs.org/-/v1/search");
  url.searchParams.set("text", parsed.name);
  url.searchParams.set("size", String(Math.min(10, Number(args.limit) || 6)));
  const data = await fetchJson(url);
  const packages = (data.objects || []).map(item => ({
    name: item.package?.name,
    version: item.package?.version,
    description: item.package?.description || "",
    url: item.package?.links?.npm,
    score: item.score?.final
  })).filter(item => item.name && item.url);
  return result("npm", `npm search: ${parsed.name}`, `Found ${packages.length} packages.`, packages, packages.map(item => source(item.name, item.url, item.description)));
}

async function pypiTool(args) {
  const parsed = extractPackage(args.query, args.package, "pypi");
  if (!parsed.exact) throw new Error("Specify an exact Python package, for example: PyPI requests.");
  const url = `https://pypi.org/pypi/${encodeURIComponent(parsed.name)}/json`;
  const data = await fetchJson(url);
  const info = data.info || {};
  const packageUrl = info.package_url || `https://pypi.org/project/${encodeURIComponent(parsed.name)}/`;
  const resultData = {
    name: info.name,
    version: info.version,
    summary: info.summary || "",
    license: info.license || "",
    requiresPython: info.requires_python || "",
    projectUrl: info.project_url || packageUrl,
    homePage: info.home_page || "",
    releaseFiles: (data.releases?.[info.version] || []).length
  };
  return result("pypi", `PyPI: ${info.name}`, `${info.name} latest version is ${info.version}. ${info.summary || ""}`, resultData, [source(`PyPI package ${info.name}`, packageUrl, info.summary || "")]);
}

async function hackerNewsTool(args) {
  const ids = await fetchJson("https://hacker-news.firebaseio.com/v0/topstories.json");
  const selected = (ids || []).slice(0, Math.min(12, Number(args.limit) || 8));
  const stories = (await Promise.all(selected.map(id =>
    fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).catch(() => null)
  ))).filter(Boolean).map(item => ({
    title: item.title,
    url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
    discussion: `https://news.ycombinator.com/item?id=${item.id}`,
    score: item.score,
    comments: item.descendants || 0,
    by: item.by,
    time: new Date(item.time * 1000).toISOString()
  }));
  return result("hackernews", "Hacker News top stories", `Fetched ${stories.length} near-real-time technology stories.`, stories, stories.map(item => source(item.title, item.url, `${item.score} points; ${item.comments} comments`)));
}

async function urlTool(args, { env }) {
  const rawUrl = args.url || args.query.match(URL_PATTERN)?.[0];
  if (!rawUrl) throw new Error("Provide a public HTTPS URL.");
  const safe = validatePublicUrl(rawUrl, env.URL_READER_ALLOWED_HOSTS);
  const response = await fetchWithRedirectChecks(safe, env.URL_READER_ALLOWED_HOSTS);
  const type = response.headers.get("content-type") || "";
  const length = Number(response.headers.get("content-length") || 0);
  if (length > 1_500_000) throw new Error("The page is too large.");
  const text = (await response.text()).slice(0, 1_500_000);
  const title = type.includes("html") ? extractTitle(text) : safe.hostname;
  const cleaned = type.includes("html") ? htmlToText(text) : text;
  const excerpt = cleaned.slice(0, 16000);
  return result("url", title || safe.hostname, `Read ${excerpt.length.toLocaleString()} characters from the public page.`, {
    url: response.url,
    title,
    contentType: type,
    excerpt
  }, [source(title || safe.hostname, response.url, excerpt.slice(0, 240))]);
}

async function rssTool(args, { env }) {
  const rawUrl = args.url || args.query.match(URL_PATTERN)?.[0];
  if (!rawUrl) throw new Error("Provide a public HTTPS RSS or Atom feed URL.");
  const safe = validatePublicUrl(rawUrl, env.URL_READER_ALLOWED_HOSTS);
  const response = await fetchWithRedirectChecks(safe, env.URL_READER_ALLOWED_HOSTS);
  const xml = (await response.text()).slice(0, 1_500_000);
  const itemBlocks = [...xml.matchAll(/<(?:item|entry)\b[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi)].slice(0, 12);
  const items = itemBlocks.map(match => {
    const block = match[1];
    const title = decodeXml(tag(block, "title")).replace(/\s+/g, " ").trim();
    const linkTag = tag(block, "link");
    const href = block.match(/<link\b[^>]*href=["']([^"']+)["']/i)?.[1];
    const link = href || decodeXml(linkTag).trim();
    const description = htmlToText(decodeXml(tag(block, "description") || tag(block, "summary") || tag(block, "content"))).slice(0, 500);
    const published = decodeXml(tag(block, "pubDate") || tag(block, "published") || tag(block, "updated"));
    return { title, url: link, description, published };
  }).filter(item => item.title && safeHttpUrl(item.url));
  return result("rss", "RSS / Atom feed", `Read ${items.length} feed items.`, items, items.map(item => source(item.title, item.url, item.description)));
}

async function webTool(args, { env, request }) {
  const result = await paidSearch(args.query, args.domainFocus || "web", env, Number(args.limit) || 8).catch(() => null);
  if (result?.sources?.length) {
    return {
      tool: "web",
      title: "Open web search",
      summary: `Found ${result.sources.length} web results using a configured search provider.`,
      data: result.sources,
      sources: result.sources,
      fetchedAt: new Date().toISOString()
    };
  }
  const fallback = await publicSearch(args.query, args.domainFocus || "web", {}, request, Number(args.limit) || 8);
  return {
    tool: "web",
    title: "Public-source discovery",
    summary: `No commercial search key is configured. Used free public data sources and found ${fallback.sources.length} results.`,
    data: fallback.sources,
    sources: fallback.sources,
    fetchedAt: new Date().toISOString()
  };
}

async function paidSearch(query, domainFocus, env, count) {
  const focused = focusQuery(query, domainFocus);
  if (env.BRAVE_SEARCH_API_KEY) {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", focused);
    url.searchParams.set("count", String(Math.min(20, count)));
    url.searchParams.set("safesearch", "moderate");
    const data = await fetchJson(url, { headers: { Accept: "application/json", "X-Subscription-Token": env.BRAVE_SEARCH_API_KEY } });
    return sourceContext((data.web?.results || []).map(item => source(item.title, item.url, item.description || "")));
  }
  if (env.TAVILY_API_KEY) {
    const data = await fetchJson("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: env.TAVILY_API_KEY, query: focused, max_results: Math.min(20, count), search_depth: "advanced", include_answer: false })
    });
    return sourceContext((data.results || []).map(item => source(item.title, item.url, item.content || "")));
  }
  if (env.SERPER_API_KEY) {
    const data = await fetchJson("https://google.serper.dev/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": env.SERPER_API_KEY },
      body: JSON.stringify({ q: focused, num: Math.min(10, count), safe: "active" })
    });
    return sourceContext((data.organic || []).map(item => source(item.title, item.link, item.snippet || "")));
  }
  return { context: "", sources: [] };
}

async function geocode(location) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", location);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  const data = await fetchJson(url);
  const item = data.results?.[0];
  if (!item) throw new Error(`Location not found: ${location}`);
  return {
    name: item.name,
    country: item.country,
    admin1: item.admin1 || "",
    latitude: item.latitude,
    longitude: item.longitude,
    timezone: item.timezone || "UTC",
    geocodeUrl: url.toString()
  };
}

function extractLocation(query, explicit) {
  if (explicit) return clean(explicit, 120);
  const patterns = [
    /\b(?:weather|forecast|temperature|mausam|barish|time)\s+(?:in|for|at|of)\s+([^?.!,]+)/i,
    /\b(?:in|at)\s+([A-Za-z][A-Za-z .'-]{2,60})\s*(?:weather|forecast|time)?$/i
  ];
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match?.[1]) return clean(match[1], 120);
  }
  return "";
}

function parseCurrency(query, args) {
  const codes = [...query.toUpperCase().matchAll(/\b[A-Z]{3}\b/g)].map(match => match[0]);
  const amountMatch = query.match(/(?:^|\s)(\d+(?:\.\d+)?)/);
  return {
    amount: Math.max(0, Number(args.amount ?? amountMatch?.[1] ?? 1)),
    from: String(args.from || codes[0] || "USD").toUpperCase(),
    to: String(args.to || codes[1] || "INR").toUpperCase()
  };
}

function parseCrypto(query, args) {
  const lower = query.toLowerCase();
  const asset = String(args.asset || (
    /\b(?:ethereum|eth)\b/.test(lower) ? "ETH" :
    /\b(?:solana|sol)\b/.test(lower) ? "SOL" :
    /\b(?:dogecoin|doge)\b/.test(lower) ? "DOGE" :
    "BTC"
  )).toUpperCase();
  const quoteMatch = query.toUpperCase().match(/\b(?:USD|INR|EUR|GBP|JPY|CAD|AUD)\b/);
  return { asset, quote: String(args.quote || quoteMatch?.[0] || "USD").toUpperCase() };
}

function extractPackage(query, explicit, ecosystem) {
  if (explicit) return { name: clean(explicit, 120), exact: true };
  const patterns = ecosystem === "npm"
    ? [/\bnpm\s+(?:package\s+)?(@?[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)?)/i, /\bpackage\s+(@?[A-Za-z0-9_.-]+)\b/i]
    : [/\bpypi\s+(?:package\s+)?([A-Za-z0-9_.-]+)/i, /\bpython package\s+([A-Za-z0-9_.-]+)/i];
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match?.[1]) return { name: match[1], exact: true };
  }
  return { name: clean(query.replace(/\bnpm\b|\bpypi\b|package|latest version/gi, " "), 120), exact: false };
}

function normalizeRepository(repository) {
  if (!repository) return "";
  if (typeof repository === "string") return repository;
  return repository.url || "";
}

function focusQuery(query, focus) {
  const prefixes = {
    academic: "(site:arxiv.org OR site:pubmed.ncbi.nlm.nih.gov OR site:crossref.org OR site:openreview.net)",
    youtube: "site:youtube.com",
    reddit: "site:reddit.com",
    code: "(site:github.com OR site:stackoverflow.com OR site:developer.mozilla.org)"
  };
  return clean(prefixes[focus] ? `${prefixes[focus]} ${query}` : query, 500);
}

function validatePublicUrl(raw, allowlistText = "") {
  let url;
  try { url = new URL(raw); } catch { throw new Error("Invalid URL."); }
  if (url.protocol !== "https:") throw new Error("Only HTTPS URLs are supported.");
  const host = url.hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || isIpLiteral(host)) {
    throw new Error("Private, local and direct-IP URLs are blocked.");
  }
  const allowed = String(allowlistText || "").split(",").map(item => item.trim().toLowerCase()).filter(Boolean);
  if (allowed.length && !allowed.some(item => host === item || host.endsWith(`.${item}`))) {
    throw new Error("This hostname is not in URL_READER_ALLOWED_HOSTS.");
  }
  url.username = "";
  url.password = "";
  return url;
}

async function fetchWithRedirectChecks(initialUrl, allowlist) {
  let url = initialUrl instanceof URL ? initialUrl : validatePublicUrl(initialUrl, allowlist);
  for (let step = 0; step < 4; step++) {
    const response = await fetchWithTimeout(url, {
      redirect: "manual",
      headers: { "User-Agent": "MARKZOSUF-AI-NEXUS/11", Accept: "text/html,application/xhtml+xml,application/xml,text/plain,application/rss+xml,application/atom+xml" }
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect had no destination.");
      url = validatePublicUrl(new URL(location, url).toString(), allowlist);
      continue;
    }
    if (!response.ok) throw new Error(`Page request failed (${response.status}).`);
    return response;
  }
  throw new Error("Too many redirects.");
}

function isIpLiteral(host) {
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return true;
  if (host.includes(":")) return true;
  return false;
}

async function fetchJson(url, options = {}) {
  const response = await fetchWithTimeout(url, {
    ...options,
    headers: { Accept: "application/json", ...(options.headers || {}) }
  });
  if (!response.ok) throw new Error(`External service failed (${response.status}).`);
  return response.json();
}

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const method = String(options.method || "GET").toUpperCase();
    const cf = method === "GET" ? { cacheTtl: 120, cacheEverything: true } : undefined;
    return await fetch(url, { ...options, signal: controller.signal, ...(cf ? { cf } : {}), headers: { ...(options.headers || {}) } });
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("External service timed out.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function result(tool, title, summary, data, sources) {
  return { tool, title, summary, data, sources: dedupeSources(sources || []), fetchedAt: new Date().toISOString() };
}

function source(title, url, description = "") {
  return { title: clean(title, 300), url: String(url || ""), description: clean(description, 700) };
}

function sourceContext(items) {
  const sources = dedupeSources(items).map((item, index) => ({ index: index + 1, ...item }));
  const context = sources.length
    ? "Public sources:\n" + sources.map(item => `[${item.index}] ${item.title}\nURL: ${item.url}\nSnippet: ${item.description}`).join("\n\n")
    : "No usable public sources were returned.";
  return { context, sources };
}

function dedupeSources(items) {
  const seen = new Set();
  return (items || []).filter(item => {
    if (!item?.url || !safeHttpUrl(item.url)) return false;
    try {
      const url = new URL(item.url);
      const key = `${url.hostname}${url.pathname}${url.search}`.replace(/\/$/, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    } catch {
      return false;
    }
  });
}

function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function weatherCode(code) {
  const map = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain", 71: "Light snow", 73: "Snow",
    75: "Heavy snow", 80: "Rain showers", 81: "Rain showers", 82: "Heavy showers",
    95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Severe thunderstorm with hail"
  };
  return map[Number(code)] || "Unknown conditions";
}

function extractTitle(html) {
  return decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/\s+/g, " ").trim().slice(0, 300);
}

function htmlToText(html) {
  return decodeHtml(String(html || "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " "))
    .trim();
}

function tag(xml, name) {
  const match = String(xml || "").match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match?.[1] || "";
}

function decodeXml(value) {
  return decodeHtml(String(value || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"));
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)));
}

function serializeData(data) {
  if (data == null) return "";
  try { return JSON.stringify(data, null, 2).slice(0, 12000); } catch { return String(data).slice(0, 12000); }
}

function clean(value, max = 1000) {
  return typeof value === "string" ? value.replace(/\u0000/g, "").trim().slice(0, max) : "";
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 6 }).format(value);
}

function assertSafeRealtimeQuery(query) {
  if (SELF_HARM_QUERY.test(query)) throw new Error("Live search is unavailable for this request. Please contact a trusted adult or emergency support if someone may be in danger.");
  if (RESTRICTED_QUERY.test(query)) throw new Error("Live external search is blocked for restricted or unsafe content.");
}
