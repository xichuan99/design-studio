import logging
import os
import ssl
from functools import lru_cache
from typing import Any

import certifi
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_ssl_context() -> ssl.SSLContext:
    context = ssl.create_default_context(cafile=certifi.where())

    extra_ca_bundle = settings.INTERNAL_CA_BUNDLE_PATH
    if extra_ca_bundle:
        if os.path.exists(extra_ca_bundle):
            context.load_verify_locations(cafile=extra_ca_bundle)
        else:
            logger.warning(
                "Configured INTERNAL_CA_BUNDLE_PATH does not exist: %s",
                extra_ca_bundle,
            )

    return context


def create_async_client(**kwargs: Any) -> httpx.AsyncClient:
    return httpx.AsyncClient(verify=get_ssl_context(), trust_env=True, **kwargs)
