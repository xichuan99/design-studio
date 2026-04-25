"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProjectEndpoints } from "@/lib/api/projectApi";
import { toast } from "sonner";

export interface ToolHandoffOptions {
  resultUrl: string;
  sourceTool: string;
  jobId?: string;
  title?: string;
}

/**
 * Creates a draft project from a tool result and navigates directly to the editor.
 * Replaces the legacy `router.push('/create?imageUrl=...')` pattern.
 */
export function useToolHandoff() {
  const router = useRouter();
  const { saveProject } = useProjectEndpoints();
  const [isLoading, setIsLoading] = useState(false);

  const openInEditor = useCallback(
    async ({ resultUrl, sourceTool, jobId, title }: ToolHandoffOptions) => {
      setIsLoading(true);
      try {
        const project = await saveProject({
          title: title ?? `Hasil ${sourceTool}`,
          status: "draft",
          canvas_state: {
            backgroundUrl: resultUrl,
            elements: [],
            workflow: {
              sourceTool,
              sourceJobId: jobId ?? null,
              entryMode: "tool_result",
            },
          },
        });
        router.push(`/edit/${project.id}`);
      } catch {
        toast.error("Gagal membuka editor. Coba lagi.");
      } finally {
        setIsLoading(false);
      }
    },
    [router, saveProject]
  );

  return { openInEditor, isLoading };
}
