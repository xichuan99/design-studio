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

export function useToolJobProgress() {
  const api = useProjectApi();
  const [loading, setLoading] = useState(false);
  const [activeJob, setActiveJob] = useState<AiToolJob | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    async (
      jobId: string,
      {
        pollIntervalMs = 1500,
        onCompleted,
        onFailed,
        onCanceled,
        onError,
      }: Omit<StartToolJobArgs, "toolName" | "payload" | "idempotencyKey">
    ) => {
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
          void pollJobStatus(jobId, {
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

  const startToolJob = useCallback(
    async ({
      toolName,
      payload,
      idempotencyKey,
      pollIntervalMs,
      onCompleted,
      onFailed,
      onCanceled,
      onError,
    }: StartToolJobArgs) => {
      setLoading(true);
      setActiveJob(null);

      const createdJob = await api.createToolJob({
        tool_name: toolName,
        payload,
        idempotency_key: idempotencyKey,
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
