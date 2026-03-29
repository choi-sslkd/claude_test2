#!/usr/bin/env python3
"""Start the scoring API server."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import click
import uvicorn

from config.settings import get_settings


@click.command()
@click.option("--host", default=None, help="Host to bind to")
@click.option("--port", default=None, type=int, help="Port to bind to")
@click.option("--reload", is_flag=True, help="Enable auto-reload for development")
def main(host: str | None, port: int | None, reload: bool):
    """Start the Prompt Guard v2 API server."""
    settings = get_settings()
    uvicorn.run(
        "src.api.app:create_app",
        factory=True,
        host=host or settings.api_host,
        port=port or settings.api_port,
        reload=reload,
    )


if __name__ == "__main__":
    main()
