"""
Launcher for local development, especially on Windows.

faster-whisper and chromadb can use subprocess/thread pools that behave
better with ProactorEventLoop on Windows (same class of issue as Playwright
in the accessibility-auditor project). Setting the event loop policy must
happen before uvicorn creates its event loop, which means it must happen
in this standalone script — not inside app/main.py, which is imported too
late in uvicorn's startup sequence.

Usage:
    py run.py
"""
import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
    )
