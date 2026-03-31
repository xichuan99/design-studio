"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export function DeploymentGuard() {
  const [hasNotified, setHasNotified] = useState(false);

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    // Read the current build ID injected during build time
    const initialBuildId = process.env.NEXT_PUBLIC_BUILD_ID || "dev";

    // Skip checking if we're in dev mode
    if (initialBuildId === "dev") return;

    const checkDeploymentVersion = async () => {
      if (hasNotified) return;

      try {
        const response = await fetch("/api/health", {
          // Ensure we don't cache this request
          cache: "no-store", 
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        });

        if (!response.ok) return;

        const data = await response.json();
        const serverBuildId = data.buildId;

        if (serverBuildId && serverBuildId !== "dev" && serverBuildId !== initialBuildId) {
          // Version mismatch detected!
          setHasNotified(true);
          
          toast.message("Versi Baru Tersedia ✨", {
            description: "Aplikasi telah diperbarui dengan fitur baru atau perbaikan. Silakan muat ulang halaman.",
            duration: Infinity, // Don't auto-dismiss
            action: (
              <Button 
                onClick={() => window.location.reload()} 
                size="sm" 
                className="gap-2 shrink-0 bg-primary/20 hover:bg-primary/30 text-primary border-primary/30"
                variant="outline"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                Refresh
              </Button>
            ),
          });
        }
      } catch (error) {
        // Silently ignore network errors to not bother the user
        console.warn("Failed to check deployment version:", error);
      }
    };

    // 1. Reactive: Catch Server Action failures immediately
    const handleActionError = (event: PromiseRejectionEvent | ErrorEvent) => {
      if (hasNotified) return;

      const errorMsg = (event instanceof PromiseRejectionEvent 
        ? (event.reason?.message || event.reason?.toString()) 
        : event.message) || "";

      // Check for common Next.js build mismatch error patterns
      // "Failed to find Server Action" is the standard message
      if (
        errorMsg.includes("Failed to find Server Action") || 
        errorMsg.includes("NEXT_NOT_FOUND") ||
        errorMsg.includes("digest") // Next.js often uses digest for minified errors
      ) {
        console.log("Detected possible deployment sync error, checking version...");
        checkDeploymentVersion();
      }
    };

    // 2. Proactive: Check when user returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkDeploymentVersion();
      }
    };

    // Listeners
    window.addEventListener("unhandledrejection", handleActionError);
    window.addEventListener("error", handleActionError);
    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", checkDeploymentVersion);

    // Initial check after mount
    const initialTimer = setTimeout(checkDeploymentVersion, 5000);
    
    // Polling interval
    const intervalId = setInterval(checkDeploymentVersion, CHECK_INTERVAL_MS);

    return () => {
      window.removeEventListener("unhandledrejection", handleActionError);
      window.removeEventListener("error", handleActionError);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", checkDeploymentVersion);
      clearTimeout(initialTimer);
      clearInterval(intervalId);
    };
  }, [hasNotified]);

  return null;
}
