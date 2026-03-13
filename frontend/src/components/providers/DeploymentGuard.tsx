"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { usePathname } from "next/navigation";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export function DeploymentGuard() {
  const [hasNotified, setHasNotified] = useState(false);
  const pathname = usePathname();

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

    // Check immediately on mount, but after a small delay to let page load finish
    const initialTimer = setTimeout(checkDeploymentVersion, 5000);
    
    // Set up polling
    const intervalId = setInterval(checkDeploymentVersion, CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalId);
    };
  }, [hasNotified]);

  // Optionally, you can also re-check on certain route changes 
  // if you want to be more proactive when user navigates
  useEffect(() => {
    // We already check on mount/interval, but we can reset the notification
    // state if they somehow navigated but didn't refresh (though NextJS usually
    // soft-navigates making this redundant, it's safe to keep track of pathname)
  }, [pathname]);

  return null; // This component doesn't render anything visible directly
}
