from typing import List, Optional

from pydantic import BaseModel


class SearchReq(BaseModel):
    query: str
    top_k: Optional[int] = None


class RelatedReq(BaseModel):
    product_id: str
    top_k: Optional[int] = None


class RecommendReq(BaseModel):
    """Personalised recommendations built from the signals a session carries:
    the live search query, recent search terms, recently viewed product ids and
    the ids the user has ordered before. All optional — cold start is handled by
    the caller."""

    query: Optional[str] = None
    search_terms: List[str] = []
    viewed_ids: List[str] = []
    ordered_ids: List[str] = []
    top_k: Optional[int] = None
