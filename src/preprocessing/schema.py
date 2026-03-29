from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class InjectionSample(BaseModel):
    """Unified schema for prompt injection samples."""

    id: str
    text: str
    label: int = Field(ge=0, le=1, description="0=benign, 1=injection")
    source: str = Field(description="Dataset name")
    category: Optional[str] = Field(
        default=None,
        description="hijacking, extraction, jailbreak, prompt_injection, leakage, etc.",
    )
    domain: Optional[str] = Field(
        default=None, description="news, legal, finance, medical, etc."
    )
    metadata: Optional[dict] = None


class AmbiguitySample(BaseModel):
    """Unified schema for ambiguity samples."""

    id: str
    text: str
    label: float = Field(ge=0.0, le=1.0, description="0.0=clear, 1.0=ambiguous")
    source: str = Field(description="Dataset name")
    category: Optional[str] = Field(
        default=None,
        description="WHOM, WHAT, WHEN, WHERE, SEMANTIC, LEXICAL, etc.",
    )
    clarification: Optional[str] = Field(
        default=None, description="Clarifying question if available"
    )
    metadata: Optional[dict] = None
