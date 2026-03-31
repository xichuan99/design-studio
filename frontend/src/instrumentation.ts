export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const originalConsoleError = console.error;

    // Monkey-patch console.error to filter out specific noisy deployment skew errors
    console.error = (...args: unknown[]) => {
      const message = args[0]?.toString() || "";
      
      // Filter out 'Failed to find Server Action' to stop log-based alerts
      if (
        message.includes('Failed to find Server Action') ||
        message.includes('NEXT_ROUTER_PREFETCH')
      ) {
        // Silently ignore or degrade to warning to avoid triggering alert scrapers
        // console.warn('[Filtered Log] Deployment Skew Detected:', message);
        return;
      }
      
      originalConsoleError.apply(console, args);
    };
  }
}
