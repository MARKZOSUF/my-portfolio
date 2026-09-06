from datetime import datetime,timezone
from app.ai.evaluation.validators import evaluate_output,numerical_sanity
from app.learning.spaced_repetition import schedule
from app.search.chunker import chunk_text
def test_chunker_overlap_and_order():
 text=('A sentence about circuits. '*400).strip();chunks=chunk_text(text,500,50);assert len(chunks)>2;assert [x.index for x in chunks]==list(range(len(chunks)));assert all(x.text for x in chunks)
def test_spaced_repetition_success():
 result=schedule(6,2.5,2,5,datetime(2026,1,1,tzinfo=timezone.utc));assert result.interval_days>=14;assert result.due_at>datetime(2026,1,1,tzinfo=timezone.utc)
def test_spaced_repetition_lapse():assert schedule(20,2.5,8,1).interval_days==1
def test_prediction_without_evidence_warns():assert evaluate_output('A sufficiently detailed but non-guaranteed priority framework for revision planning. '*2,'exam_prediction',0).warnings
def test_numerical_requires_units():assert numerical_sanity('Formula x. Substitution y. Answer 4.')
