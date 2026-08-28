"""Local hashing-based RAG. No external embedding API key is required.

Labels follow the citation model: web chunks are ``[n]`` and document chunks
are ``[Dn]`` so retrieved evidence matches the citation contract.
"""
import hashlib
import math
import re
from dataclasses import dataclass


def chunks(text, size=1200, overlap=180):
    text = re.sub(r"\s+", " ", text or "").strip()
    out = []
    start = 0
    while start < len(text):
        end = min(len(text), start + size)
        out.append(text[start:end])
        if end == len(text):
            break
        start = max(start + 1, end - overlap)
    return out


def local_embedding(text, dims=384):
    vec = [0.0] * dims
    for token in re.findall(r"[\w-]{2,}", text.lower()):
        h = int(hashlib.sha256(token.encode()).hexdigest()[:16], 16)
        vec[h % dims] += 1 if (h >> 8) & 1 else -1
    norm = math.sqrt(sum(v * v for v in vec)) or 1
    return [v / norm for v in vec]


def cosine(a, b):
    return sum(x * y for x, y in zip(a, b))


@dataclass
class RetrievedChunk:
    text: str
    score: float
    source_label: str


class VectorStore:
    def add(self, records):
        raise NotImplementedError

    def search(self, query, limit=8):
        raise NotImplementedError


class LocalVectorStore(VectorStore):
    def __init__(self):
        self.rows = []

    def add(self, records):
        for text, label in records:
            if text:
                self.rows.append((local_embedding(text), text, label))

    def search(self, query, limit=8):
        q = local_embedding(query)
        ranked = sorted(((cosine(q, v), t, l) for v, t, l in self.rows), key=lambda x: x[0], reverse=True)
        return [RetrievedChunk(t, s, l) for s, t, l in ranked[:limit]]


def build_store(sources, documents=None):
    """Build an in-memory store. Documents are labeled D1..Dn in input order."""
    store = LocalVectorStore()
    records = []
    for i, src in enumerate(sources, 1):
        text = getattr(src, "extracted_text", "") or getattr(src, "snippet", "") or ""
        records.extend((c, f"[{i}]") for c in chunks(text))
    for i, doc in enumerate(documents or [], 1):
        records.extend((c, f"[D{i}]") for c in chunks(doc.extracted_text))
    store.add(records)
    return store
