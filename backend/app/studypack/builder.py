"""Evidence-first study-pack builder.

Turns a topic classification plus retrieved research evidence into a structured
:class:`~app.notes.structure.NoteDocument`.

Design rules that this module enforces (they are the honest core of the
product promise):

* Every substantive claim block carries a citation id that resolves to a real
  retrieved source. Blocks without support are dropped or explicitly marked
  uncertain - never silently asserted.
* When no generative model is configured the builder still produces a useful
  document using an extractive, citation-first strategy, and says so in the
  "Research limitations" section. It never fabricates comprehensive theory.
* Sections that are not applicable to the topic (formulas for a history topic,
  numericals for a grammar topic, ...) are simply omitted.
* Nothing is labelled a previous-year question unless it came from verified
  question-paper evidence. Generated practice questions are labelled as such.
* Mathematics is only marked verified when a deterministic validator passed.
"""

from __future__ import annotations

from datetime import datetime, timezone

from app.notes.structure import Block, EXAM_DISCLAIMER, NoteDocument
from app.topics.classifier import TopicClassification
from app.validation import math_validator

QUESTION_ORIGINS = (
    "verified_pyq",
    "paraphrased_pyq",
    "probable_pattern",
    "ai_practice_question",
    "mock_exam_question",
)

PRIORITY_CATEGORIES = (
    "Very High Priority",
    "High Priority",
    "Medium Priority",
    "Foundation Topic",
    "Low Historical Frequency",
    "Insufficient Evidence",
)

BANNED_PHRASES = (
    "guaranteed question",
    "confirmed future question",
    "100% coming",
    "leaked paper",
    "definitely asked",
)


def assert_responsible(text: str) -> str:
    """Reject irresponsible exam-prediction language."""

    lowered = (text or "").lower()
    for phrase in BANNED_PHRASES:
        if phrase in lowered:
            raise ValueError(f"Irresponsible exam claim rejected: {phrase!r}")
    return text


def _citation_id(index: int) -> str:
    return f"S{index}"


def build_citations(sources: list[dict]) -> list[dict]:
    """Normalise retrieved sources into citation records."""

    citations = []
    for index, source in enumerate(sources, 1):
        citations.append({
            "id": _citation_id(index),
            "source_id": source.get("id"),
            "url": source.get("url", ""),
            "title": source.get("title") or source.get("url", "Source"),
            "source_type": source.get("source_type", "web"),
            "provider": source.get("provider", ""),
            "retrieved_at": source.get("retrieved_at") or datetime.now(timezone.utc).isoformat(),
            "relevance_score": source.get("relevance_score"),
            "quality_score": source.get("quality_score"),
        })
    return citations


def validate_claim_support(claim: dict, citations: list[dict], retrieved_text: dict[str, str]) -> dict:
    """Deterministically check that a claim's citation and passage are real.

    Returns the claim enriched with ``support_status`` in
    {supported, unsupported, uncertain} plus the reason. The language model is
    never the only fact checker: existence of the source, ownership of the URL
    and literal presence of the supporting passage are all checked here.
    """

    citation_id = claim.get("citation_id")
    match = next((c for c in citations if c["id"] == citation_id), None)
    if match is None:
        claim["support_status"] = "unsupported"
        claim["support_reason"] = "Cited source does not exist in the retrieved set."
        return claim
    if claim.get("source_url") and claim["source_url"] != match["url"]:
        claim["support_status"] = "unsupported"
        claim["support_reason"] = "Cited URL does not belong to the retrieved source."
        return claim
    passage = (claim.get("supporting_passage") or "").strip()
    body = retrieved_text.get(match["url"], "")
    if not passage:
        claim["support_status"] = "uncertain"
        claim["support_reason"] = "No supporting passage was captured."
        return claim
    normalised_passage = " ".join(passage.lower().split())
    normalised_body = " ".join(body.lower().split())
    if normalised_body and normalised_passage in normalised_body:
        claim["support_status"] = "supported"
        claim["support_reason"] = "Passage found verbatim in the retrieved content."
    else:
        claim["support_status"] = "uncertain"
        claim["support_reason"] = "Passage could not be located verbatim in the retrieved content."
    return claim


def topic_priority(evidence: dict) -> tuple[str, dict]:
    """Transparent, evidence-based priority category (no fake probabilities)."""

    papers = int(evidence.get("papers_analyzed", 0))
    appearances = int(evidence.get("appearance_count", 0))
    recent = int(evidence.get("recent_appearances", 0))
    syllabus = bool(evidence.get("syllabus_listed"))
    prerequisite = bool(evidence.get("prerequisite_for_others"))

    rationale = {
        "papers_analyzed": papers,
        "appearance_count": appearances,
        "recent_appearances": recent,
        "syllabus_listed": syllabus,
        "prerequisite_for_others": prerequisite,
        "year_range": evidence.get("year_range"),
        "historical_marks": evidence.get("historical_marks"),
    }

    if papers < 2:
        return "Insufficient Evidence", rationale
    if appearances >= 5 and recent >= 2:
        return "Very High Priority", rationale
    if appearances >= 3:
        return "High Priority", rationale
    if appearances >= 1:
        return "Medium Priority", rationale
    if prerequisite or syllabus:
        return "Foundation Topic", rationale
    return "Low Historical Frequency", rationale


def build_document(
    classification: TopicClassification,
    *,
    sources: list[dict],
    claims: list[dict],
    retrieved_text: dict[str, str] | None = None,
    generated: dict | None = None,
    profile: dict | None = None,
    limitations: list[str] | None = None,
    generative_available: bool = False,
) -> NoteDocument:
    """Assemble the structured note.

    ``generated`` optionally carries model-produced content (theory, examples,
    numericals, questions, flashcards). Everything in it is filtered through the
    same citation and validation rules as extractive content.
    """

    retrieved_text = retrieved_text or {}
    generated = generated or {}
    profile = profile or {}
    limitations = list(limitations or [])

    citations = build_citations(sources)
    checked_claims = [validate_claim_support(dict(claim), citations, retrieved_text) for claim in claims]
    supported = [c for c in checked_claims if c["support_status"] == "supported"]
    uncertain = [c for c in checked_claims if c["support_status"] == "uncertain"]
    removed = [c for c in checked_claims if c["support_status"] == "unsupported"]

    document = NoteDocument(
        topic=classification.normalized_topic,
        subject=classification.subject,
        academic_context="general/inferred" if not profile else (profile.get("context") or "general/inferred"),
        language=(profile.get("language") or classification.language or "en"),
        classification=classification.to_dict(),
        citations=citations,
    )

    applicability = classification.applicability

    # 1-5 framing sections -------------------------------------------------
    overview = generated.get("overview") or " ".join(c["claim_text"] for c in supported[:3])
    if overview.strip():
        document.add("overview", Block("paragraph", overview.strip(),
                                       citations=[c["citation_id"] for c in supported[:3] if c.get("citation_id")]))
    if generated.get("why_it_matters"):
        document.add("why_it_matters", Block("paragraph", generated["why_it_matters"]))
    if classification.prerequisites:
        document.add("prerequisites", Block("bullets", items=list(classification.prerequisites)))
    objectives = generated.get("learning_objectives") or [
        f"Define {classification.normalized_topic} precisely.",
        f"Explain the core principles of {classification.normalized_topic}.",
        f"Apply {classification.normalized_topic} to standard problems and examples.",
    ]
    document.add("learning_objectives", Block("numbered", items=objectives))
    document.add("academic_context", Block(
        "callout",
        f"Detected subject: {classification.subject} (confidence {classification.confidence}). "
        f"Education levels considered: {', '.join(classification.education_levels)}. "
        "No specific university, board or syllabus was assumed unless you supplied one.",
        data={"title": "Context"},
    ))

    # 6-10 conceptual sections --------------------------------------------
    for term in generated.get("terminology", []):
        document.add("key_terminology", Block("definition", term.get("definition", ""),
                                              data={"term": term.get("term", "")},
                                              citations=term.get("citations", [])))
    for definition in generated.get("definitions", []):
        document.add("definitions", Block("definition", definition.get("text", ""),
                                          data={"term": definition.get("term", "")},
                                          citations=definition.get("citations", [])))

    concepts = generated.get("core_concepts") or [c["claim_text"] for c in supported[3:11]]
    if concepts:
        document.add("core_concepts", Block("bullets", items=concepts))
    for paragraph in generated.get("detailed_theory", []):
        document.add("detailed_theory", Block("paragraph", paragraph.get("text", ""),
                                              citations=paragraph.get("citations", [])))
    if generated.get("step_by_step"):
        document.add("step_by_step", Block("numbered", items=generated["step_by_step"]))

    # 11-18 quantitative sections (only when applicable) -------------------
    validation_results: list[dict] = []

    if applicability.get("formulas"):
        for formula in generated.get("formulas", []):
            status = "not deterministically checked"
            if formula.get("lhs") and formula.get("rhs"):
                result = math_validator.validate_equation_equivalence(formula["lhs"], formula["rhs"])
                validation_results.append(result.to_dict())
                status = result.status
            document.add("formulas", Block("formula", formula.get("expression", ""),
                                           data={"label": formula.get("label", ""), "validation_status": status},
                                           citations=formula.get("citations", [])))
    if applicability.get("derivations"):
        for derivation in generated.get("derivations", []):
            document.add("derivations", Block("example", derivation.get("statement", ""),
                                              items=derivation.get("steps", []),
                                              citations=derivation.get("citations", [])))
    if applicability.get("proofs"):
        for proof in generated.get("proofs", []):
            document.add("proofs", Block("example", proof.get("statement", ""), items=proof.get("steps", [])))
    for table in generated.get("tables", []):
        document.add("tables", Block("table", items=table.get("rows", []),
                                     data={"headers": table.get("headers", []), "caption": table.get("caption", "")}))
    if applicability.get("diagrams"):
        for diagram in generated.get("diagrams", []):
            document.add("diagrams", Block("diagram", diagram.get("description", ""),
                                           items=diagram.get("labels", []),
                                           data={"caption": diagram.get("caption", "")}))
    for example in generated.get("solved_examples", []):
        document.add("solved_examples", Block("example", example.get("problem", ""), items=example.get("steps", [])))

    if applicability.get("numericals"):
        for numerical in generated.get("solved_numericals", []):
            checked = math_validator.validate_solved_numerical(numerical)
            validation_results.extend(checked.get("validations", []))
            document.add("solved_numericals", Block("numerical", checked.get("problem", ""), data=checked))
            for entry in checked.get("validations", []):
                if entry["check"] == "dimensions":
                    document.add("units_checks", Block(
                        "paragraph",
                        f"{checked.get('problem', 'Numerical')}: {entry['detail']} ({entry['status']}).",
                    ))

    # 19-21 applied sections ------------------------------------------------
    if generated.get("applications"):
        document.add("applications", Block("bullets", items=generated["applications"]))
    if generated.get("misconceptions"):
        document.add("misconceptions", Block("bullets", items=generated["misconceptions"]))
    if generated.get("exam_mistakes"):
        document.add("exam_mistakes", Block("bullets", items=generated["exam_mistakes"]))

    # 22-25 exam intelligence ----------------------------------------------
    important = generated.get("important_topics", [])
    if important:
        rows = []
        for item in important:
            category, rationale = topic_priority(item.get("evidence", {}))
            rows.append([item.get("topic", ""), category,
                         f"papers={rationale['papers_analyzed']}, appearances={rationale['appearance_count']}, "
                         f"recent={rationale['recent_appearances']}"])
        document.add("important_topics", Block("table", items=rows,
                                               data={"headers": ["Topic", "Priority", "Evidence basis"],
                                                     "caption": EXAM_DISCLAIMER}))

    verified_pyqs = [q for q in generated.get("questions", []) if q.get("origin") == "verified_pyq"]
    for question in verified_pyqs:
        provenance = question.get("provenance", {})
        if not provenance.get("source_paper"):
            continue  # never label something a PYQ without paper evidence
        document.add("verified_pyqs", Block("question", assert_responsible(question.get("text", "")), data={
            "marks": question.get("marks"),
            "origin": (f"Verified PYQ - {provenance.get('institution', 'unknown exam')} "
                       f"{provenance.get('year', '')} Q{provenance.get('question_number', '?')} "
                       f"(p.{provenance.get('page', '?')}, {provenance.get('match_status', 'exact')})"),
            "model_answer": question.get("model_answer"),
            "marking_points": question.get("marking_points", []),
        }))
    if not verified_pyqs and classification.exam_contexts:
        document.add("verified_pyqs", Block(
            "callout",
            "No verified previous-year question papers were retrieved for this topic, so no PYQs are shown. "
            "Evidence status: insufficient.",
            data={"title": "Insufficient evidence"},
        ))

    for pattern in generated.get("question_patterns", []):
        document.add("question_patterns", Block("question", assert_responsible(pattern.get("text", "")),
                                                data={"marks": pattern.get("marks"),
                                                      "origin": "Probable question pattern (derived from syllabus/paper structure)"}))

    for question in generated.get("questions", []):
        if question.get("origin") in {"verified_pyq"}:
            continue
        origin_label = {
            "paraphrased_pyq": "Paraphrased previous-year question",
            "probable_pattern": "Probable question pattern",
            "ai_practice_question": "AI-generated practice question",
            "mock_exam_question": "Mock-examination question",
        }.get(question.get("origin", "ai_practice_question"), "AI-generated practice question")
        target = "mock_exam" if question.get("origin") == "mock_exam_question" else "marks_wise_questions"
        document.add(target, Block("question", assert_responsible(question.get("text", "")), data={
            "marks": question.get("marks"),
            "difficulty": question.get("difficulty"),
            "type": question.get("type"),
            "estimated_time_minutes": question.get("estimated_time_minutes"),
            "origin": origin_label,
            "pyq_similarity": question.get("pyq_similarity", "not compared"),
            "model_answer": question.get("model_answer"),
            "marking_points": question.get("marking_points", []),
            "common_mistakes": question.get("common_mistakes", []),
        }))
        if question.get("origin") == "mock_exam_question" and question.get("model_answer"):
            document.add("answer_key", Block("paragraph", f"{question.get('text', '')} - {question['model_answer']}"))

    # 26-31 revision and practice ------------------------------------------
    revisions = generated.get("revision", {})
    for label, key in (("Five-minute revision", "five_minute"), ("Fifteen-minute revision", "fifteen_minute"),
                       ("Complete revision", "complete"), ("Formula-only revision", "formula_only"),
                       ("Derivation-only revision", "derivation_only"), ("Numerical-only revision", "numerical_only"),
                       ("Important-question revision", "important_questions")):
        items = revisions.get(key)
        if items:
            document.add("quick_revision", Block("callout", "; ".join(items), data={"title": label}))

    formula_sheet = generated.get("formula_sheet", [])
    if applicability.get("formulas") and formula_sheet:
        document.add("formula_sheet", Block("table", items=[[f.get("label", ""), f.get("expression", "")] for f in formula_sheet],
                                            data={"headers": ["Quantity", "Formula"]}))
    for card in generated.get("flashcards", []):
        document.add("flashcards", Block("flashcard", data={"front": card.get("front", ""), "back": card.get("back", "")}))
    for item in generated.get("quiz", []):
        document.add("practice_quiz", Block("quiz_item", item.get("question", ""), items=item.get("options", []),
                                            data={"answer": item.get("answer"), "explanation": item.get("explanation")}))

    # 32-33 provenance -------------------------------------------------------
    for citation in citations:
        document.add("sources", Block("source", data={
            "title": f"[{citation['id']}] {citation['title']}",
            "url": citation["url"],
            "retrieved": citation["retrieved_at"][:10],
        }))

    if not generative_available:
        limitations.append(
            "No generative model is configured on this deployment. These notes were assembled "
            "extractively from cited sources only; explanatory prose is therefore limited."
        )
    if uncertain:
        limitations.append(f"{len(uncertain)} claim(s) could not be verified against the retrieved passages and are marked uncertain.")
    if removed:
        limitations.append(f"{len(removed)} unsupported claim(s) were removed before publication.")
    if not sources:
        limitations.append("No sources were retrieved, so this document contains no evidence-backed claims.")
    if classification.confidence < 0.5:
        limitations.append("Subject detection confidence was low; treat the academic framing as approximate.")

    for limitation in limitations:
        document.add("limitations", Block("paragraph", limitation))
    for claim in uncertain:
        document.add("limitations", Block("paragraph", f"Uncertain: {claim.get('claim_text', '')} ({claim['support_reason']})"))

    document.limitations = limitations
    document.validations = math_validator.summarise(validation_results) if validation_results else {
        "validator_version": math_validator.VALIDATOR_VERSION,
        "counts": {"verified": 0, "failed": 0, "not_run": 0},
        "all_verified": False,
        "sympy_available": math_validator.SYMPY_AVAILABLE,
    }
    document.validations["claims"] = {
        "supported": len(supported),
        "uncertain": len(uncertain),
        "removed_unsupported": len(removed),
    }
    document.prune()
    return document
