"use client";

import { DownloadIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "haythive-pwa-install-dismissed";

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible || !deferred) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:justify-end">
      <div className="pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl border border-border bg-card p-3 shadow-lg">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Install HaytHive</p>
          <p className="text-xs text-muted-foreground">
            Add to your home screen for a full-screen dock console.
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              onClick={async () => {
                await deferred.prompt();
                await deferred.userChoice;
                setVisible(false);
                setDeferred(null);
              }}
            >
              <DownloadIcon data-icon="inline-start" />
              Install
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                localStorage.setItem(DISMISS_KEY, "1");
                setVisible(false);
              }}
            >
              Not now
            </Button>
          </div>
        </div>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Dismiss install prompt"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "1");
            setVisible(false);
          }}
        >
          <XIcon />
        </Button>
      </div>
    </div>
  );
}
