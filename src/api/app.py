"""FastAPI application factory for the scoring API."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from src.api.routes import router
from src.inference.scorer import PromptScorer


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup, cleanup on shutdown."""
    scorer = PromptScorer(
        injection_model_type="knn",
        ambiguity_model_type="knn",
    )
    scorer.load_models()
    app.state.scorer = scorer
    yield
    app.state.scorer = None


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Prompt Guard v2",
        description=(
            "ML-based prompt injection detection and ambiguity scoring API.\n\n"
            "Scores prompts as percentages:\n"
            "- Prompt Injection: N%\n"
            "- 모호함 (Ambiguity): N%\n\n"
            "Uses KNN with distance-weighted voting for interpretable scores."
        ),
        version="0.2.0",
        lifespan=lifespan,
    )
    app.include_router(router)
    return app
