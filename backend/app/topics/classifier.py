"""Deterministic topic understanding.

Given only a topic string this module infers subject, domain, likely education
levels, prerequisites, subtopics, applicability flags (formulas / derivations /
numericals / diagrams) and ambiguity, each with an explicit confidence value.

It is intentionally deterministic (no LLM required) so that:

* topic-only generation still works when no generative model is configured;
* results are testable and reproducible;
* the system never silently claims a university/board/syllabus it cannot support.

When an LLM *is* configured the orchestrator may enrich this classification, but
the deterministic result is always the floor.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field, asdict

GENERAL_CONTEXT = "general/inferred"


@dataclass
class TopicClassification:
    topic: str
    normalized_topic: str
    subject: str
    domain: str
    confidence: float
    education_levels: list[str] = field(default_factory=list)
    academic_contexts: list[str] = field(default_factory=list)
    prerequisites: list[str] = field(default_factory=list)
    subtopics: list[str] = field(default_factory=list)
    ambiguous_meanings: list[str] = field(default_factory=list)
    is_ambiguous: bool = False
    clarification_question: str | None = None
    applicability: dict[str, bool] = field(default_factory=dict)
    research_relevance: str = "stable"
    exam_contexts: list[str] = field(default_factory=list)
    language: str = "en"
    signals: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


# (domain, subject, keywords, subtopics, prerequisites, applicability)
_DOMAINS: list[tuple[str, str, tuple[str, ...], tuple[str, ...], tuple[str, ...], dict[str, bool]]] = [
    (
        "physical-sciences", "Physics",
        ("quantum", "mechanics", "thermodynamic", "optics", "electricity", "magnetism", "relativity",
         "wave", "photon", "compton", "broglie", "schrodinger", "schrödinger", "kinematics", "electrostatic",
         "semiconductor", "nuclear", "oscillation", "engineering physics"),
        ("Fundamental definitions", "Governing equations", "Derivations", "Worked numericals", "Applications"),
        ("Algebra", "Calculus", "Vectors", "Basic mechanics"),
        {"formulas": True, "derivations": True, "numericals": True, "diagrams": True, "proofs": False},
    ),
    (
        "mathematics", "Mathematics",
        ("matrix", "matrices", "algebra", "calculus", "integral", "derivative", "differential", "eigen",
         "determinant", "vector space", "probability", "statistics", "geometry", "trigonometry", "laplace",
         "fourier", "number theory", "linear programming"),
        ("Definitions and notation", "Core theorems", "Standard methods", "Worked examples", "Common pitfalls"),
        ("Arithmetic", "Elementary algebra"),
        {"formulas": True, "derivations": True, "numericals": True, "diagrams": False, "proofs": True},
    ),
    (
        "chemistry", "Chemistry",
        ("chemistry", "chemical", "organic", "inorganic", "periodic", "mole", "stoichiometry", "electrochem",
         "bonding", "reaction", "acid", "base", "polymer"),
        ("Key definitions", "Reaction mechanisms", "Equations and balancing", "Numerical problems", "Applications"),
        ("Atomic structure", "Basic algebra"),
        {"formulas": True, "derivations": False, "numericals": True, "diagrams": True, "proofs": False},
    ),
    (
        "life-sciences", "Biology",
        ("photosynthesis", "biology", "cell", "genetic", "dna", "enzyme", "respiration", "ecosystem",
         "evolution", "human body", "neuron", "microbio", "botany", "zoology"),
        ("Definitions", "Structures involved", "Process steps", "Labelled diagrams", "Significance"),
        ("Basic cell biology", "Basic chemistry"),
        {"formulas": False, "derivations": False, "numericals": False, "diagrams": True, "proofs": False},
    ),
    (
        "computer-science", "Computer Science",
        ("data structure", "algorithm", "operating system", "database", "network", "compiler", "programming",
         "software", "machine learning", "artificial intelligence", "computer", "os ", "dbms", "sorting",
         "graph", "tree", "complexity"),
        ("Core definitions", "Design and structure", "Algorithms and complexity", "Worked examples", "Trade-offs"),
        ("Basic programming", "Discrete mathematics"),
        {"formulas": True, "derivations": False, "numericals": True, "diagrams": True, "proofs": False},
    ),
    (
        "engineering", "Engineering",
        ("engineering", "circuit", "machine design", "fluid", "thermal", "structural", "signal", "control system",
         "instrumentation", "manufacturing"),
        ("Definitions", "Governing relations", "Design procedure", "Worked numericals", "Applications"),
        ("Physics", "Mathematics"),
        {"formulas": True, "derivations": True, "numericals": True, "diagrams": True, "proofs": False},
    ),
    (
        "social-sciences", "Social Science",
        ("constitution", "polity", "history", "geography", "economics", "civics", "governance", "parliament",
         "upsc", "political", "public administration", "sociology"),
        ("Background and context", "Key provisions or events", "Institutions and actors", "Debates", "Significance"),
        ("General awareness",),
        {"formulas": False, "derivations": False, "numericals": False, "diagrams": False, "proofs": False},
    ),
    (
        "commerce", "Commerce & Management",
        ("accounting", "finance", "management", "marketing", "business", "balance sheet", "audit", "taxation"),
        ("Definitions", "Principles", "Formats and statements", "Worked problems", "Applications"),
        ("Basic arithmetic",),
        {"formulas": True, "derivations": False, "numericals": True, "diagrams": False, "proofs": False},
    ),
    (
        "languages-humanities", "Language & Humanities",
        ("grammar", "literature", "poetry", "essay", "philosophy", "linguistics", "comprehension"),
        ("Definitions", "Key concepts", "Examples", "Analysis", "Practice"),
        (),
        {"formulas": False, "derivations": False, "numericals": False, "diagrams": False, "proofs": False},
    ),
]

_LEVEL_SIGNALS: list[tuple[str, tuple[str, ...]]] = [
    ("school", ("class 6", "class 7", "class 8", "class 9", "class 10", "class 11", "class 12", "cbse", "icse",
                "ncert", "board exam", "high school", "secondary")),
    ("undergraduate", ("b.tech", "btech", "be ", "bsc", "b.sc", "engineering", "semester", "aktu", "university",
                       "college", "undergraduate", "diploma")),
    ("postgraduate", ("m.tech", "msc", "m.sc", "postgraduate", "masters", "phd", "research")),
    ("competitive-exam", ("upsc", "jee", "neet", "gate", "ssc", "cat ", "clat", "net ", "olympiad")),
]

# Topics whose plain name genuinely maps to more than one field.
_AMBIGUOUS: dict[str, tuple[str, ...]] = {
    "mercury": ("the planet (astronomy)", "the chemical element (chemistry)", "the Roman deity (mythology)"),
    "cell": ("biological cell (biology)", "electrochemical cell (chemistry/physics)", "spreadsheet cell (computing)"),
    "tree": ("data structure (computer science)", "plant (biology)"),
    "matrix": ("mathematical matrix (linear algebra)", "biological matrix (biology)"),
    "stack": ("data structure (computer science)", "memory stack (systems)"),
    "field": ("physical field (physics)", "algebraic field (mathematics)", "database field (computing)"),
    "power": ("physics/electrical power", "political power (social science)", "exponentiation (mathematics)"),
    "root": ("plant root (biology)", "root of an equation (mathematics)", "root user (computing)"),
    "function": ("mathematical function", "biological function", "programming function"),
    "current": ("electric current (physics)", "ocean current (geography)"),
}

_FRESH_SIGNALS = ("ai", "artificial intelligence", "machine learning", "llm", "blockchain", "crypto", "climate",
                  "policy", "election", "pandemic", "technology", "latest", "2024", "2025", "2026", "current affairs")

_DEVANAGARI = re.compile(r"[\u0900-\u097F]")


def detect_language(text: str) -> str:
    """Return 'hi' for Devanagari, 'hinglish' for romanised Hindi markers, else 'en'."""

    if _DEVANAGARI.search(text):
        return "hi"
    lowered = f" {text.lower()} "
    hinglish_markers = (" kya ", " kaise ", " samjhao ", " hindi me ", " me ", " ka ", " ke ", " ki ", " bataye ")
    if sum(marker in lowered for marker in hinglish_markers) >= 2:
        return "hinglish"
    return "en"


def normalize(topic: str) -> str:
    cleaned = re.sub(r"\s+", " ", topic or "").strip()
    cleaned = re.sub(r"^(explain|teach me|notes on|study|about)\s+", "", cleaned, flags=re.I)
    return cleaned.strip(" .,:;-")


def classify(topic: str) -> TopicClassification:
    """Classify a raw topic string. Never raises for ordinary input."""

    normalized = normalize(topic)
    lowered = f" {normalized.lower()} "
    signals: list[str] = []

    best_domain = "general"
    best_subject = "General Studies"
    best_subtopics: tuple[str, ...] = ("Overview", "Key concepts", "Details", "Examples", "Summary")
    best_prereqs: tuple[str, ...] = ()
    best_applicability = {"formulas": False, "derivations": False, "numericals": False, "diagrams": False, "proofs": False}
    best_score = 0

    for domain, subject, keywords, subtopics, prereqs, applicability in _DOMAINS:
        score = sum(1 for keyword in keywords if keyword in lowered)
        if score > best_score:
            best_score = score
            best_domain, best_subject = domain, subject
            best_subtopics, best_prereqs, best_applicability = subtopics, prereqs, applicability
            signals = [keyword for keyword in keywords if keyword in lowered]

    # Confidence: deterministic keyword evidence only.
    if best_score == 0:
        confidence = 0.25
    elif best_score == 1:
        confidence = 0.6
    elif best_score == 2:
        confidence = 0.78
    else:
        confidence = 0.9

    levels: list[str] = []
    for level, markers in _LEVEL_SIGNALS:
        if any(marker in lowered for marker in markers):
            levels.append(level)
    if not levels:
        levels = ["school", "undergraduate"] if best_domain != "general" else ["general"]

    exam_contexts = [level for level in levels if level == "competitive-exam"]

    token = normalized.lower().strip()
    ambiguous_meanings = list(_AMBIGUOUS.get(token, ()))
    # Only single-word bare topics are treated as materially ambiguous.
    is_ambiguous = bool(ambiguous_meanings) and len(normalized.split()) == 1
    clarification = None
    if is_ambiguous:
        clarification = f"'{normalized}' can mean several things. Which do you mean?"

    relevance = "fast-moving" if any(marker in lowered for marker in _FRESH_SIGNALS) else "stable"

    return TopicClassification(
        topic=topic,
        normalized_topic=normalized or topic,
        subject=best_subject,
        domain=best_domain,
        confidence=round(confidence, 2),
        education_levels=levels,
        academic_contexts=[GENERAL_CONTEXT],
        prerequisites=list(best_prereqs),
        subtopics=list(best_subtopics),
        ambiguous_meanings=ambiguous_meanings,
        is_ambiguous=is_ambiguous,
        clarification_question=clarification,
        applicability=dict(best_applicability),
        research_relevance=relevance,
        exam_contexts=exam_contexts,
        language=detect_language(normalized),
        signals=signals[:8],
    )


def research_queries(classification: TopicClassification, profile: dict | None = None) -> list[str]:
    """Build the search-query plan from the classification (+ optional profile)."""

    topic = classification.normalized_topic
    queries = [
        topic,
        f"{topic} definition {classification.subject}",
        f"{topic} explanation textbook",
        f"{topic} applications examples",
        f"{topic} limitations common misconceptions",
    ]
    if classification.applicability.get("formulas"):
        queries.append(f"{topic} formulas equations")
    if classification.applicability.get("derivations"):
        queries.append(f"{topic} derivation proof")
    if classification.applicability.get("numericals"):
        queries.append(f"{topic} solved numerical problems")
    if classification.research_relevance == "fast-moving":
        queries.append(f"{topic} recent developments")

    profile = profile or {}
    syllabus_terms = [
        profile.get("university") or profile.get("board") or profile.get("school"),
        profile.get("course"),
        profile.get("subject_code"),
        profile.get("target_exam"),
    ]
    extra = " ".join(str(term) for term in syllabus_terms if term)
    if extra.strip():
        queries.append(f"{topic} syllabus {extra.strip()}")
        queries.append(f"{topic} previous year question paper {extra.strip()}")

    seen: set[str] = set()
    ordered: list[str] = []
    for query in queries:
        key = query.lower().strip()
        if key and key not in seen:
            seen.add(key)
            ordered.append(query.strip())
    return ordered
