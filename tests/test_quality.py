from services.research.citations import validate_result_citations
def test_invalid_citation_replaced():
    r=validate_result_citations({"overview":"Known [1], bad [9]","claims":[],"quick_summary":"","complete_notes_markdown":"","revision_sheet_markdown":"","comparison_tables_markdown":""},1); assert "[9]" not in r["overview"]; assert r["citation_quality"]["invalid_citations_replaced"]==[9]
def test_unsupported_claim_marked():
    raw={"overview":"","quick_summary":"","complete_notes_markdown":"","revision_sheet_markdown":"","comparison_tables_markdown":"","claims":[{"claim":"x","confidence":.9,"supporting_source_ids":[]}]}; assert validate_result_citations(raw,0)["claims"][0]["verification_status"]=="needs_verification"
