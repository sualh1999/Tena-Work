"""Embedding generation service.

- Loads SentenceTransformers model once (wired in via FastAPI lifespan).
- Computes embeddings in a worker thread to avoid blocking the event loop.
"""

from __future__ import annotations

from dataclasses import dataclass

import anyio
import numpy as np
from sentence_transformers import SentenceTransformer


@dataclass(frozen=True)
class EmbeddingService:
    model: SentenceTransformer
    embedding_dim: int

    async def embed_text(self, text: str) -> list[float]:
        def _encode() -> np.ndarray:
            # `normalize_embeddings=True` makes cosine computations more stable.
            return self.model.encode(
                [text],
                convert_to_numpy=True,
                normalize_embeddings=True,
                show_progress_bar=False,
            )[0]

        vector = await anyio.to_thread.run_sync(_encode)
        vector = np.asarray(vector, dtype=np.float32)

        if vector.shape != (self.embedding_dim,):
            raise ValueError(
                f"Unexpected embedding dimension {vector.shape}; expected ({self.embedding_dim},)"
            )

        return vector.astype(np.float32).tolist()
