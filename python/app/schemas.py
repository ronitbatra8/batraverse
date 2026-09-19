from typing import Optional

from pydantic import BaseModel


class SearchReq(BaseModel):
    query: str
    top_k: Optional[int] = None


class RelatedReq(BaseModel):
    product_id: str
    top_k: Optional[int] = None