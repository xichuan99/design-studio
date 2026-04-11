"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const CHECK_INTERVAL_MS = 30 * 1000; // 30 seconds
const RELOAD_MARKER_KEY = "deployment-guard-reloaded";

export function DeploymentGuard() {
  const [hasNotified, setHasNotified] = useState(false);
  const initialBuildId = process.env.NEXT_PUBLIC_BUILD_ID || "dev";
  const assignedBuildIdRef = useRef<string>(initialBuildId);

  const reloadForSync = useCallback(() => {
    if (typeof window === "undefined") return;

    const reloadMarker = `${RELOAD_MARKER_KEY}:${assignedBuildIdRef.current}`;
    if (sessionStorage.getItem(reloadMarker) === "1") {
      return;
    }

    sessionStorage.setItem(reloadMarker, "1");
    window.location.reload();
  }, []);

  const checkDeploymentVersion = useCallback(async () => {
    if (hasNotified || initialBuildId === "dev") return;

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

      if (serverBuildId && serverBuildId !== "dev" && serverBuildId !== assignedBuildIdRef.current) {
        setHasNotified(true);

        toast.info("Update Tersedia ✨", {
          description: "Aplikasi telah diperbarui. Memuat ulang untuk sinkronisasi...",
          duration: 3000,
          onAutoClose: reloadForSync,
          action: (
            <Button
              onClick={reloadForSync}
              size="sm"
              className="gap-2 shrink-0"
              variant="default"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Refresh Sekarang
            </Button>
          ),
        });
      }
    } catch {
      // Silently ignore network errors to not bother the user
    }
  }, [hasNotified, initialBuildId, reloadForSync]);

  // Re-check version on every client-side navigation
  const pathname = usePathname();
  useEffect(() => {
    if (!hasNotified) {
      // Defer to next tick to avoid "cascading render" lint warning
      const timer = setTimeout(() => {
        void checkDeploymentVersion();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [pathname, hasNotified, checkDeploymentVersion]);

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

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
        errorMsg.includes("NEXT_ROUTER_PREFETCH") ||
        errorMsg.includes("digest") // Next.js internal error ID
      ) {
        console.warn("Detected possible deployment sync error (skew):", errorMsg);
        
        // Immediate action for Server Action mismatch
        if (errorMsg.includes("Failed to find Server Action")) {
          // Force immediate silent reload to "fix" the state
          console.log("Forcing immediate reload due to Server Action mismatch...");
          reloadForSync();
          return;
        }

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
  }, [hasNotified, checkDeploymentVersion, reloadForSync]);

  return null;
}
