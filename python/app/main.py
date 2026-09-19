"""BATRAVERSE ML service: semantic search + similar products.

Run:  uvicorn app.main:app --host 0.0.0.0 --port 8000
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from .config import TOP_K
from .db import get_pool
from .embedder import embed_texts, get_model
from .schemas import RelatedReq, SearchReq
from .vectors import VectorStore

store = VectorStore()


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