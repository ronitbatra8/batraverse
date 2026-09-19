import os
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

_DATABASE_URL = os.environ.get("DATABASE_URL", "")


def _normalize_db_url(url: str) -> str:
    if not url:
        return url
    parts = urlsplit(url)
    if not parts.query:
        return url
    keep = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if k != "schema"]
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(keep), parts.fragment))


DATABASE_URL = _normalize_db_url(_DATABASE_URL)
MODEL_NAME = os.environ.get("MODEL_NAME", "paraphrase-multilingual-MiniLM-L12-v2")
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8000"))
TOP_K = int(os.environ.get("TOP_K", "40"))