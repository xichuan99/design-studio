"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { useProjectEndpoints } from "@/lib/api/projectApi";
import { toast } from "sonner";
import type { CopywritingVariation } from "@/lib/api";
import type { ImportQueueItem } from "@/lib/import-queue";

export interface ToolHandoffOptions {
  resultUrl: string;
  sourceTool: string;
  jobId?: string;
  title?: string;
  intent?: string;
  entryMode?: string;
  primaryAsset?: {
    url: string;
    filename?: string;
  };
  copyVariants?: CopywritingVariation[];
  importQueue?: ImportQueueItem[];
}

/**
 * Creates a draft project from a tool result and navigates directly to the editor.
 * Replaces the legacy `router.push('/create?imageUrl=...')` pattern.
 */
export function useToolHandoff() {
  const router = useRouter();
  const posthog = usePostHog();
  const { saveProject } = useProjectEndpoints();
  const [isLoading, setIsLoading] = useState(false);

  const openInEditor = useCallback(
    async ({
      resultUrl,
      sourceTool,
      jobId,
      title,
      intent,
      entryMode,
      primaryAsset,
      copyVariants,
      importQueue,
    }: ToolHandoffOptions) => {
      setIsLoading(true);
      try {
        const workflow: Record<string, unknown> = {
          sourceTool,
          sourceJobId: jobId ?? null,
          entryMode: entryMode ?? "tool_result",
          primaryAsset: primaryAsset ?? { url: resultUrl },
        };
        if (intent) workflow.intent = intent;
        if (copyVariants && copyVariants.length > 0) workflow.copyVariants = copyVariants;
        if (importQueue && importQueue.length > 0) workflow.importQueue = importQueue;

        posthog?.capture("editor_handoff_initiated", {
          source_tool: sourceTool,
          source_job_id: jobId ?? null,
          intent: intent ?? null,
          entry_mode: workflow.entryMode,
          has_copy_variants: !!copyVariants?.length,
          import_queue_count: importQueue?.length ?? 0,
        });

        const project = await saveProject({
          title: title ?? `Hasil ${sourceTool}`,
          status: "draft",
          canvas_state: {
            backgroundUrl: resultUrl,
            elements: [],
            workflow,
          },
        });
        router.push(`/edit/${project.id}`);
      } catch {
        toast.error("Gagal membuka editor. Coba lagi.");
      } finally {
        setIsLoading(false);
      }
    },
    [posthog, router, saveProject]
  );

  return { openInEditor, isLoading };
}
