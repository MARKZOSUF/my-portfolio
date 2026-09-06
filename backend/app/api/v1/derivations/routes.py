"""Stepwise derivations, persisted as StudyArtifact(kind='derivations')."""
from app.knowledge.artifacts import build_artifact_router
router=build_artifact_router('derivations','/derivations','derivations',mode='study_everything')
