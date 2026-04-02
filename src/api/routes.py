"""FastAPI route definitions for the scoring API."""

from __future__ import annotations

import os
import time

from fastapi import APIRouter, HTTPException, Request, Header
from typing import Optional

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

# ML 서버 API 키 (환경변수 또는 기본값)
ML_API_KEY = os.environ.get("ML_API_KEY", "ml-internal-key")

# 프롬프트 최대 길이
MAX_PROMPT_LENGTH = 5000


def _verify_api_key(x_ml_key: Optional[str]):
    """ML 서버 인증: 비활성화 (테스트 모드)"""
    pass  # 인증 비활성화


def _validate_prompt(prompt: str):
    """프롬프트 크기 검증"""
    if len(prompt) > MAX_PROMPT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Prompt too long: {len(prompt)} chars (max {MAX_PROMPT_LENGTH})",
        )


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
async def score_prompt(
    request: Request,
    body: ScoreRequest,
    x_ml_key: Optional[str] = Header(None),
):
    """Score a single prompt for injection and ambiguity."""
    _verify_api_key(x_ml_key)
    _validate_prompt(body.prompt)

    scorer = request.app.state.scorer
    if not scorer.is_loaded:
        raise HTTPException(status_code=503, detail="Models not loaded")
    result = scorer.score(body.prompt)
    return _to_score_response(result)


@router.post("/score/detailed", response_model=DetailedScoreResponse)
async def score_prompt_detailed(
    request: Request,
    body: ScoreRequest,
    x_ml_key: Optional[str] = Header(None),
):
    """Score with KNN neighbor details for interpretability."""
    _verify_api_key(x_ml_key)
    _validate_prompt(body.prompt)

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
async def batch_score_prompts(
    request: Request,
    body: BatchScoreRequest,
    x_ml_key: Optional[str] = Header(None),
):
    """Score multiple prompts in batch."""
    _verify_api_key(x_ml_key)
    for p in body.prompts:
        _validate_prompt(p)

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
    """Health check endpoint (인증 불필요)."""
    scorer = request.app.state.scorer
    return HealthResponse(
        status="ok" if scorer.is_loaded else "degraded",
        models_loaded=scorer.is_loaded,
        injection_model=scorer.injection_model_type,
        ambiguity_model=scorer.ambiguity_model_type,
        version=scorer.VERSION,
    )
