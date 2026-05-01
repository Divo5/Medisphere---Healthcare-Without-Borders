"""
Simple in-memory rate limiter middleware
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
from datetime import datetime, timedelta
import asyncio


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 100, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for docs
        if request.url.path in ["/api/docs", "/api/redoc", "/openapi.json"]:
            return await call_next(request)

        client_ip = request.client.host
        now = datetime.utcnow()
        window_start = now - timedelta(seconds=self.window_seconds)

        # Clean old requests
        self.requests[client_ip] = [
            t for t in self.requests[client_ip] if t > window_start
        ]

        if len(self.requests[client_ip]) >= self.max_requests:
            return Response(
                content='{"detail":"Too many requests. Please slow down."}',
                status_code=429,
                media_type="application/json",
            )

        self.requests[client_ip].append(now)
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(
            self.max_requests - len(self.requests[client_ip])
        )
        return response
