import json
import logging
import time
from typing import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

# Configure structured logging
logger = logging.getLogger("api_access")
logger.setLevel(logging.INFO)

# Avoid adding multiple handlers if the module is reloaded
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("%(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)


class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        start_time = time.time()

        request_id = getattr(request.state, "request_id", None)

        log_data_request = {
            "type": "request_in",
            "request_id": request_id,
            "method": request.method,
            "url": str(request.url),
            "client": request.client.host if request.client else None,
        }
        logger.info(json.dumps(log_data_request))

        try:
            response = await call_next(request)

            process_time = time.time() - start_time
            log_data_response = {
                "type": "request_out",
                "request_id": request_id,
                "method": request.method,
                "url": str(request.url),
                "status_code": response.status_code,
                "duration_ms": round(process_time * 1000, 2),
            }
            logger.info(json.dumps(log_data_response))

            return response

        except Exception as e:
            process_time = time.time() - start_time
            log_data_error = {
                "type": "request_error",
                "request_id": request_id,
                "method": request.method,
                "url": str(request.url),
                "error": str(e),
                "duration_ms": round(process_time * 1000, 2),
            }
            logger.error(json.dumps(log_data_error))
            raise
