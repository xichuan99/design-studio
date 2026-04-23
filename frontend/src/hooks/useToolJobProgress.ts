"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectApi } from "@/lib/api";
import type { AiToolJob, AiToolJobName } from "@/lib/api";

type JobTerminalCallback = (job: AiToolJob) => void;
type JobErrorCallback = (error: unknown) => void;

interface StartToolJobArgs {
  toolName: AiToolJobName;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
  quality?: 'standard' | 'ultra';
  pollIntervalMs?: number;
  onCompleted?: JobTerminalCallback;
  onFailed?: JobTerminalCallback;
  onCanceled?: JobTerminalCallback;
  onError?: JobErrorCallback;
}

interface CancelArgs {
  onCanceled?: JobTerminalCallback;
  onError?: JobErrorCallback;
}

type PollJobOptions = Omit<StartToolJobArgs, "toolName" | "payload" | "idempotencyKey">;

type PollJobStatusFn = (jobId: string, options: PollJobOptions) => Promise<void>;

const MAX_IDEMPOTENCY_KEY_LENGTH = 255;

function normalizeIdempotencyKey(idempotencyKey?: string): string | undefined {
  if (!idempotencyKey) {
    return undefined;
  }

  if (idempotencyKey.length <= MAX_IDEMPOTENCY_KEY_LENGTH) {
    return idempotencyKey;
  }

  let hash = 0;
  for (let index = 0; index < idempotencyKey.length; index += 1) {
    hash = (hash * 31 + idempotencyKey.charCodeAt(index)) >>> 0;
  }

  return `hash31:${hash.toString(16)}:${idempotencyKey.length}`;
}

export function useToolJobProgress() {
  const api = useProjectApi();
  const [loading, setLoading] = useState(false);
  const [activeJob, setActiveJob] = useState<AiToolJob | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollJobStatusRef = useRef<PollJobStatusFn | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const pollJobStatus = useCallback(
    async (jobId: string, { pollIntervalMs = 1500, onCompleted, onFailed, onCanceled, onError }: PollJobOptions) => {
      try {
        const job = await api.getToolJobStatus(jobId);
        setActiveJob(job);

        if (job.status === "completed") {
          stopPolling();
          setLoading(false);
          onCompleted?.(job);
          return;
        }

        if (job.status === "failed") {
          stopPolling();
          setLoading(false);
          onFailed?.(job);
          return;
        }

        if (job.status === "canceled") {
          stopPolling();
          setLoading(false);
          onCanceled?.(job);
          return;
        }

        pollTimerRef.current = setTimeout(() => {
          const poll = pollJobStatusRef.current;
          if (!poll) return;

          void poll(jobId, {
            pollIntervalMs,
            onCompleted,
            onFailed,
            onCanceled,
            onError,
          });
        }, pollIntervalMs);
      } catch (error) {
        stopPolling();
        setLoading(false);
        onError?.(error);
      }
    },
    [api, stopPolling]
  );

  useEffect(() => {
    pollJobStatusRef.current = pollJobStatus;
  }, [pollJobStatus]);

  const startToolJob = useCallback(
    async ({
      toolName,
      payload,
      idempotencyKey,
      quality,
      pollIntervalMs,
      onCompleted,
      onFailed,
      onCanceled,
      onError,
    }: StartToolJobArgs) => {
      setLoading(true);
      setActiveJob(null);

      const normalizedIdempotencyKey = normalizeIdempotencyKey(idempotencyKey);

      const createdJob = await api.createToolJob({
        tool_name: toolName,
        payload,
        idempotency_key: normalizedIdempotencyKey,
        quality,
      });
      setActiveJob(createdJob);

      await pollJobStatus(createdJob.job_id, {
        pollIntervalMs,
        onCompleted,
        onFailed,
        onCanceled,
        onError,
      });

      return createdJob;
    },
    [api, pollJobStatus]
  );

  const cancelActiveJob = useCallback(
    async ({ onCanceled, onError }: CancelArgs = {}) => {
      if (!activeJob) return null;
      try {
        const canceled = await api.cancelToolJob(activeJob.job_id);
        setActiveJob(canceled);
        stopPolling();
        setLoading(false);
        onCanceled?.(canceled);
        return canceled;
      } catch (error) {
        onError?.(error);
        return null;
      }
    },
    [activeJob, api, stopPolling]
  );

  const resetToolJob = useCallback(() => {
    stopPolling();
    setLoading(false);
    setActiveJob(null);
  }, [stopPolling]);

  return {
    loading,
    activeJob,
    startToolJob,
    cancelActiveJob,
    resetToolJob,
    stopPolling,
  };
}
