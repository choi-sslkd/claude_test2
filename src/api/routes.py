"""FastAPI route definitions for the scoring API."""

from __future__ import annotations

import time

from fastapi import APIRouter, HTTPException, Request

from src.api.schemas import (
    BatchScoreRequest,
    BatchScoreResponse,
    HealthResponse,
    ScoreRequest,
    ScoreResponse,
)

router = APIRouter(prefix="/v1")


@router.post("/score", response_model=ScoreResponse)
async def score_prompt(request: Request, body: ScoreRequest):
    """Score a single prompt for injection and ambiguity."""
    scorer = request.app.state.scorer
    if not scorer.is_loaded:
        raise HTTPException(status_code=503, detail="Models not loaded")
    result = scorer.score(body.prompt)
    return ScoreResponse(
        injection_score=result.injection_score,
        ambiguity_score=result.ambiguity_score,
        injection_label=result.injection_label,
        ambiguity_label=result.ambiguity_label,
        model_version=result.model_version,
        latency_ms=result.latency_ms,
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
        results=[
            ScoreResponse(
                injection_score=r.injection_score,
                ambiguity_score=r.ambiguity_score,
                injection_label=r.injection_label,
                ambiguity_label=r.ambiguity_label,
                model_version=r.model_version,
                latency_ms=r.latency_ms,
            )
            for r in results
        ],
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
