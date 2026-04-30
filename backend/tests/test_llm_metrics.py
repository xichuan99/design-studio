from unittest.mock import MagicMock, call, patch

from app.services.llm_metrics import get_llm_metrics_snapshot, record_llm_routing_event


def test_record_llm_routing_event_updates_global_and_model_counters():
    redis_client = MagicMock()

    with patch("app.services.llm_metrics.redis_sync_client", redis_client):
        record_llm_routing_event(
            event="llm.primary.rate_limited",
            model_id="openrouter/deepseek/deepseek-v4-flash",
        )

    redis_client.incr.assert_called_once_with("llm:metrics:event:llm.primary.rate_limited")
    redis_client.hincrby.assert_called_once_with(
        "llm:metrics:model:llm.primary.rate_limited",
        "openrouter/deepseek/deepseek-v4-flash",
        1,
    )
    assert redis_client.expire.call_args_list == [
        call("llm:metrics:event:llm.primary.rate_limited", 604800),
        call("llm:metrics:model:llm.primary.rate_limited", 604800),
    ]


def test_record_llm_routing_event_is_noop_when_redis_unavailable():
    with patch("app.services.llm_metrics.redis_sync_client", None):
        record_llm_routing_event(
            event="llm.primary.cooldown_route",
            model_id="gemini-2.0-flash",
        )


def test_get_llm_metrics_snapshot_reads_event_and_model_maps():
    redis_client = MagicMock()
    redis_client.scan_iter.side_effect = [
        ["llm:metrics:event:llm.primary.rate_limited"],
        ["llm:metrics:model:llm.primary.rate_limited"],
    ]
    redis_client.get.return_value = "3"
    redis_client.hgetall.return_value = {
        "openrouter/deepseek/deepseek-v4-flash": "2",
        "openrouter/qwen/qwen3.6-flash": "1",
    }

    with patch("app.services.llm_metrics.redis_sync_client", redis_client):
        snapshot = get_llm_metrics_snapshot()

    assert snapshot["available"] is True
    assert snapshot["events"]["llm.primary.rate_limited"] == 3
    assert snapshot["models"]["llm.primary.rate_limited"] == {
        "openrouter/deepseek/deepseek-v4-flash": 2,
        "openrouter/qwen/qwen3.6-flash": 1,
    }