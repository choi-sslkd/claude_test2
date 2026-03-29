"""Request/Response Pydantic models for the scoring API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ScoreRequest(BaseModel):
    prompt: str = Field(min_length=1, description="The prompt text to score")


class BatchScoreRequest(BaseModel):
    prompts: list[str] = Field(min_length=1, max_length=100, description="List of prompts to score")


class ScoreResponse(BaseModel):
    injection_score: float = Field(ge=0.0, le=1.0)
    ambiguity_score: float = Field(ge=0.0, le=1.0)
    injection_label: str
    ambiguity_label: str
    model_version: str
    latency_ms: float


class BatchScoreResponse(BaseModel):
    results: list[ScoreResponse]
    total_latency_ms: float


class HealthResponse(BaseModel):
    status: str
    models_loaded: bool
    injection_model: str
    ambiguity_model: str
    version: str
