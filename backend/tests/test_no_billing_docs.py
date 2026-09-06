"""StudyForge is a free product: no billing surface may creep back in."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".expo", "build", ".gradle",
    ".cxx", "dist", ".venv", "venv",
}

# Legitimate, non-billing uses of the word that must stay: statements that
# billing is absent, references to the removal artifacts themselves (the deleted
# doc, the guard test, the migration that drops the tables), and the historical
# setting names those artifacts assert are gone.
ALLOWED = re.compile(
    r"no subscriptions|paywalled|out of scope|intentionally absent|"
    r"is a free product|REMOVED|free-product|no billing|Billing is|"
    r"drops the legacy subscription|remove_billing|billing_provider|"
    r"billing_webhook_secret|ai_usage_billing|AI usage|"
    r"docs/BILLING\.md|test_no_billing_docs|keep billing out|"
    r"Billing docs|billing docs|billing removal|Billing removal|"
    r"billing is removed|Deleted ",
    re.IGNORECASE,
)


def _files(*suffixes: str):
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix not in suffixes:
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        yield path


def test_obsolete_billing_doc_is_deleted():
    assert not (ROOT / "docs" / "BILLING.md").exists(), (
        "docs/BILLING.md documents a removed feature and must stay deleted"
    )


def test_manifest_does_not_reference_the_deleted_doc():
    manifest = json.loads((ROOT / "PROJECT_MANIFEST.json").read_text())
    blob = json.dumps(manifest)
    assert "docs/BILLING.md" not in blob, (
        "PROJECT_MANIFEST.json still lists the deleted docs/BILLING.md"
    )


def test_no_document_claims_billing_is_implemented():
    offenders = []
    pattern = re.compile(r"billing", re.IGNORECASE)
    for path in _files(".md"):
        for number, line in enumerate(path.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
            if pattern.search(line) and not ALLOWED.search(line):
                offenders.append(f"{path.relative_to(ROOT)}:{number}: {line.strip()[:110]}")
    assert not offenders, "unqualified billing references remain:\n" + "\n".join(offenders)


def test_no_billing_settings_remain():
    source = (ROOT / "backend" / "app" / "config" / "settings.py").read_text()
    assert "billing_provider" not in source
    assert "billing_webhook_secret" not in source
    assert "stripe" not in source.lower()


def test_no_payment_provider_dependency():
    requirements = (ROOT / "backend" / "requirements.txt").read_text().lower()
    for package in ("stripe", "razorpay", "paddle", "braintree"):
        assert package not in requirements, f"{package} must not be a dependency"


def test_mobile_has_no_paywall_or_iap_dependency():
    package = json.loads((ROOT / "mobile" / "package.json").read_text())
    deps = {**package.get("dependencies", {}), **package.get("devDependencies", {})}
    for name in deps:
        lowered = name.lower()
        assert "iap" not in lowered and "purchas" not in lowered and "revenuecat" not in lowered, (
            f"{name} implies in-app purchases; StudyForge is free"
        )
