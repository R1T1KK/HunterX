"use client";

import { useState, useEffect } from "react";
import { Download, Share, X, PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (PWA installed)
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    setIsStandalone(isStandaloneMode);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Android / Chromium beforeinstallprompt handler
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallAndroid = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === "accepted") {
      console.log("📲 [PWA] User accepted the HIDERUSH install prompt");
    } else {
      console.log("📲 [PWA] User dismissed the HIDERUSH install prompt");
    }
    setDeferredPrompt(null);
  };

  // If already installed as standalone PWA or dismissed, hide prompt
  if (isStandalone || dismissed) {
    return null;
  }

  return (
    <>
      {/* Android / Desktop Chrome Custom Install Bar */}
      {deferredPrompt && (
        <div className="fixed bottom-20 left-4 right-4 z-40 max-w-md mx-auto animate-in fade-in slide-in-from-bottom duration-300">
          <div className="bg-game-charcoal/95 border border-game-crimson/40 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-md flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-game-crimson/20 border border-game-crimson/40 flex items-center justify-center text-game-crimson shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-white truncate">Install HIDERUSH</p>
                <p className="text-xs text-game-text-muted">Fullscreen tactical GPS gaming</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="primary" onClick={handleInstallAndroid}>
                Install
              </Button>
              <button
                onClick={() => setDismissed(true)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-game-text-muted hover:text-white"
                aria-label="Dismiss install banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Safari Home Screen Guide Trigger */}
      {isIOS && !deferredPrompt && (
        <div className="fixed bottom-20 left-4 right-4 z-40 max-w-md mx-auto">
          <button
            onClick={() => setShowIOSModal(true)}
            className="w-full bg-game-card/90 border border-game-border hover:border-neutral-600 rounded-2xl py-2.5 px-4 shadow-lg backdrop-blur-md flex items-center justify-center gap-2 text-xs font-semibold text-game-text-muted hover:text-white transition-all cursor-pointer"
          >
            <Share className="w-4 h-4 text-game-crimson" />
            <span>Install HIDERUSH for iOS (Fullscreen Mode)</span>
          </button>
        </div>
      )}

      {/* iOS Safari Instructional Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-game-card border border-game-border rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl safe-bottom">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-game-crimson/20 flex items-center justify-center text-game-crimson font-bold text-sm">
                  iOS
                </div>
                <h3 className="font-extrabold text-white text-base">Add to Home Screen</h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="w-8 h-8 rounded-full bg-game-charcoal flex items-center justify-center text-game-text-muted hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-game-text-muted leading-relaxed">
              Mobile Safari does not allow automatic app installation. Follow these 2 steps for full-bleed fullscreen gameplay:
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 bg-game-charcoal/70 p-3 rounded-2xl border border-game-border">
                <div className="w-7 h-7 rounded-xl bg-neutral-800 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                  <Share className="w-4 h-4" />
                </div>
                <div className="text-xs text-game-text">
                  <span className="font-bold text-white">1. Tap Safari Share:</span> Tap the Share icon in the bottom Safari toolbar.
                </div>
              </div>

              <div className="flex items-start gap-3 bg-game-charcoal/70 p-3 rounded-2xl border border-game-border">
                <div className="w-7 h-7 rounded-xl bg-neutral-800 flex items-center justify-center text-white shrink-0 mt-0.5">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div className="text-xs text-game-text">
                  <span className="font-bold text-white">2. Add to Home Screen:</span> Scroll down and tap <span className="text-game-crimson font-semibold">&quot;Add to Home Screen&quot;</span>.
                </div>
              </div>
            </div>

            <Button
              variant="secondary"
              fullWidth
              size="default"
              onClick={() => setShowIOSModal(false)}
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
