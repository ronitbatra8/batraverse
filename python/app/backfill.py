"""One-shot: embed every public product into product_vector.

Run:  python -m app.backfill
"""

from .config import MODEL_NAME
from .db import get_pool
from .embedder import embed_texts


def build_text(row) -> str:
    _, name, brand, category, sub, description = row
    return " | ".join(part for part in (name, brand, category, sub, description) if part)


def main() -> None:
    pool = get_pool()
    with pool.connection() as conn:
        rows = conn.execute(
            """
            SELECT id, name, brand, category, "subCategory", description
            FROM "Product"
            WHERE status = 'approved' AND "baseProductId" IS NULL
            """
        ).fetchall()

    print(f"public products: {len(rows)}")
    if not rows:
        return

    texts = [build_text(r) for r in rows]
    print(f"embedding with {MODEL_NAME} ...")
    vecs = embed_texts(texts)

    with pool.connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS product_vector (
                product_id  text PRIMARY KEY,
                embedding   real[] NOT NULL,
                updated_at  timestamptz NOT NULL DEFAULT now()
            )
            """
        )
        for row, vec in zip(rows, vecs):
            conn.execute(
                """
                INSERT INTO product_vector (product_id, embedding)
                VALUES (%s, %s)
                ON CONFLICT (product_id)
                DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = now()
                """,
                (row[0], list(vec)),
            )

    print(f"stored {len(vecs)} vectors")


if __name__ == "__main__":
    main()