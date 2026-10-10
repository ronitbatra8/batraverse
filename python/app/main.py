"""BATRAVERSE ML service: semantic search, similar products, recommendations.

Run:  uvicorn app.main:app --host 0.0.0.0 --port 8000
"""

from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI

from .config import TOP_K
from .db import get_pool
from .embedder import embed_texts, get_model
from .schemas import RecommendReq, RelatedReq, SearchReq
from .vectors import VectorStore

store = VectorStore()

# Signal weights for the recommendation preference vector. An order is the
# strongest intent signal, the live query next, then a view, then a past search.
W_QUERY = 1.2
W_TERM = 0.7
W_VIEW = 1.0
W_ORDER = 1.6
VIEW_DECAY = 0.9
ORDER_DECAY = 0.95


@asynccontextmanager
async def lifespan(_app: FastAPI):
    store.load(get_pool())
    get_model()  # warm the model so the first search isn't a 30s stall
    embed_texts(["warm up probe"])  # first in-process encode is slow; pay it at boot
    yield


app = FastAPI(title="BATRAVERSE ML", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok", "model": "loaded", "vectors": store.size}


@app.post("/search")
def search(body: SearchReq):
    emb = embed_texts([body.query])
    hits = store.top_k(emb[0], k=min(body.top_k or TOP_K, 200))
    return {"query": body.query, "results": hits}


@app.post("/related")
def related(body: RelatedReq):
    emb = store.embedding_of(body.product_id)
    if emb is None or emb.size == 0:
        return {"product_id": body.product_id, "results": []}
    hits = store.top_k(emb, k=min(body.top_k or TOP_K, 200), exclude=body.product_id)
    return {"product_id": body.product_id, "results": hits}


@app.post("/recommend")
def recommend(body: RecommendReq):
    """Content-based recommendation: build one preference vector as a weighted
    average of the embeddings of everything the session has shown interest in
    (ordered products > live query > viewed > past searches), then take the
    nearest catalogue neighbours — excluding the products already seen."""
    parts: list[tuple[np.ndarray, float]] = []

    if body.query and body.query.strip():
        parts.append((np.asarray(embed_texts([body.query.strip()])[0], dtype=np.float32), W_QUERY))

    for term in body.search_terms[:8]:
        term = str(term).strip()
        if not term:
            continue
        parts.append((np.asarray(embed_texts([term])[0], dtype=np.float32), W_TERM))

    for i, pid in enumerate(body.viewed_ids[:16]):
        vec = store.embedding_of(pid)
        if vec is not None:
            parts.append((np.asarray(vec, dtype=np.float32), W_VIEW * (VIEW_DECAY ** min(i, 10))))

    for i, pid in enumerate(body.ordered_ids[:40]):
        vec = store.embedding_of(pid)
        if vec is not None:
            parts.append((np.asarray(vec, dtype=np.float32), W_ORDER * (ORDER_DECAY ** min(i, 15))))

    if not parts:
        return {"results": [], "engine": "cold", "signals": 0}

    pref = np.zeros_like(parts[0][0])
    for vec, weight in parts:
        pref += weight * vec
    norm = float(np.linalg.norm(pref))
    if norm == 0.0:
        return {"results": [], "engine": "cold", "signals": len(parts)}

    pref = (pref / norm).reshape(1, -1)
    exclude = set(body.viewed_ids) | set(body.ordered_ids)
    k = min(body.top_k or 20, 60)

    sims = pref @ store.mat.T
    order = np.argsort(-sims[0])
    results = []
    for i in order:
        pid = store.ids[i]
        if pid in exclude:
            continue
        results.append({"product_id": pid, "score": float(sims[0, i])})
        if len(results) >= k:
            break

    return {"results": results, "engine": "content", "signals": len(parts)}
