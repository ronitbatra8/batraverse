import numpy as np


class VectorStore:
    """All catalog vectors in memory (catalog is small). Cosine similarity is a
    single matmul — microseconds for ~1k products. Vectors are persisted in the
    product_vector side table so restarts don't re-embed."""

    def __init__(self) -> None:
        self.ids: list[str] = []
        self.mat: np.ndarray = np.empty((0, 0), dtype=np.float32)

    def load(self, pool) -> None:
        with pool.connection() as conn:
            rows = conn.execute(
                "SELECT product_id, embedding FROM product_vector"
            ).fetchall()
        self.ids = [r[0] for r in rows]
        if rows:
            self.mat = np.array([r[1] for r in rows], dtype=np.float32)
        else:
            self.mat = np.empty((0, 0), dtype=np.float32)

    @property
    def size(self) -> int:
        return len(self.ids)

    def top_k(self, emb, k: int = 40, exclude: str | None = None) -> list[dict]:
        if self.mat.size == 0:
            return []
        e = np.asarray(emb, dtype=np.float32).reshape(1, -1)
        sims = e @ self.mat.T  # embeddings are L2-normalized -> dot == cosine
        order = np.argsort(-sims[0])
        out = []
        for i in order:
            pid = self.ids[i]
            if exclude and pid == exclude:
                continue
            out.append({"product_id": pid, "score": float(sims[0, i])})
            if len(out) >= k:
                break
        return out

    def embedding_of(self, product_id: str):
        try:
            idx = self.ids.index(product_id)
        except ValueError:
            return None
        return self.mat[idx]