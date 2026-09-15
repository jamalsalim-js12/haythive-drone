import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <BrandLogo className="h-10 w-auto" />
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-foreground">You&apos;re offline</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          HaytHive Dock needs a network connection for live dock telemetry and
          commands. Reconnect, then try again.
        </p>
      </div>
      <Button nativeButton={false} render={<Link href="/" />}>
        Back to dock
      </Button>
    </main>
  );
}
