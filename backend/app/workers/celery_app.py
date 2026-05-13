"""Celery app instance configured with Redis broker."""

from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "design_studio",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Jakarta",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    beat_schedule={
        "reconcile-storage-every-10-min": {
            "task": "app.workers.storage_reconcile.reconcile_pending_storage_purchases",
            "schedule": crontab(minute="*/10"),
        },
        "reconcile-credit-every-10-min": {
            "task": "app.workers.credit_reconcile.reconcile_pending_credit_purchases",
            "schedule": crontab(minute="*/10"),
        },
    },
)

# Auto-discover tasks module
celery_app.autodiscover_tasks(["app.workers"])
