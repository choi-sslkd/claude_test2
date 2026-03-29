"""FastAPI route definitions for the scoring API."""

from __future__ import annotations

import time

from fastapi import APIRouter, HTTPException, Request

from src.api.schemas import (
    BatchScoreRequest,
    BatchScoreResponse,
    DetailedScoreResponse,
    HealthResponse,
    NeighborInfo,
    ScoreRequest,
    ScoreResponse,
)

router = APIRouter(prefix="/v1")


def _to_score_response(result) -> ScoreResponse:
    return ScoreResponse(
        injection_score=result.injection_score,
        ambiguity_score=result.ambiguity_score,
        injection_label=result.injection_label,
        ambiguity_label=result.ambiguity_label,
        injection_pct=result.injection_pct,
        ambiguity_pct=result.ambiguity_pct,
        model_version=result.model_version,
        latency_ms=result.latency_ms,
    )


@router.post("/score", response_model=ScoreResponse)
async def score_prompt(request: Request, body: ScoreRequest):
    """Score a single prompt for injection and ambiguity.

    Returns percentage-based scores:
      - Prompt Injection: N%
      - 모호함 (Ambiguity): N%
    """
    scorer = request.app.state.scorer
    if not scorer.is_loaded:
        raise HTTPException(status_code=503, detail="Models not loaded")
    result = scorer.score(body.prompt)
    return _to_score_response(result)


@router.post("/score/detailed", response_model=DetailedScoreResponse)
async def score_prompt_detailed(request: Request, body: ScoreRequest):
    """Score with KNN neighbor details for interpretability.

    Shows the K nearest neighbors that contributed to the score,
    explaining WHY the model classified the prompt this way.
    """
    scorer = request.app.state.scorer
    if not scorer.is_loaded:
        raise HTTPException(status_code=503, detail="Models not loaded")

    result = scorer.score_detailed(body.prompt)
    return DetailedScoreResponse(
        injection_score=result.injection_score,
        ambiguity_score=result.ambiguity_score,
        injection_label=result.injection_label,
        ambiguity_label=result.ambiguity_label,
        injection_pct=result.injection_pct,
        ambiguity_pct=result.ambiguity_pct,
        model_version=result.model_version,
        latency_ms=result.latency_ms,
        injection_neighbors=[
            NeighborInfo(**n) for n in result.injection_neighbors
        ],
        ambiguity_neighbors=[
            NeighborInfo(**n) for n in result.ambiguity_neighbors
        ],
    )


@router.post("/batch-score", response_model=BatchScoreResponse)
async def batch_score_prompts(request: Request, body: BatchScoreRequest):
    """Score multiple prompts in batch."""
    scorer = request.app.state.scorer
    if not scorer.is_loaded:
        raise HTTPException(status_code=503, detail="Models not loaded")

    start = time.perf_counter()
    results = scorer.batch_score(body.prompts)
    total_ms = (time.perf_counter() - start) * 1000

    return BatchScoreResponse(
        results=[_to_score_response(r) for r in results],
        total_latency_ms=round(total_ms, 2),
    )


@router.get("/health", response_model=HealthResponse)
async def health_check(request: Request):
    """Health check endpoint."""
    scorer = request.app.state.scorer
    return HealthResponse(
        status="ok" if scorer.is_loaded else "degraded",
        models_loaded=scorer.is_loaded,
        injection_model=scorer.injection_model_type,
        ambiguity_model=scorer.ambiguity_model_type,
        version=scorer.VERSION,
    )
