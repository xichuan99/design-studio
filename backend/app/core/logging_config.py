import logging
import json
import traceback
from datetime import datetime, timezone

class JSONLogFormatter(logging.Formatter):
    """
    Formatter that outputs JSON strings after parsing the LogRecord.
    """
    def __init__(self, **kwargs):
        super().__init__()
        self.kwargs = kwargs

    def format(self, record):
        log_record = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
            log_record["traceback"] = "".join(traceback.format_exception(*record.exc_info))

        if hasattr(record, "request_id") and record.request_id:
            log_record["request_id"] = record.request_id

        # Update with any additional kwargs
        log_record.update(self.kwargs)

        return json.dumps(log_record)

def setup_logging():
    """
    Sets up global structured JSON logging for the application.
    """
    root_logger = logging.getLogger()
    # Remove existing handlers to avoid duplicate logs
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    handler = logging.StreamHandler()
    formatter = JSONLogFormatter()
    handler.setFormatter(formatter)

    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO)

    # Optional: adjust third-party loggers if they are too noisy
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.WARNING)
