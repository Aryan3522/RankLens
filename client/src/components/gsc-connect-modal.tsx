import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Globe, CheckCircle, XCircle, ExternalLink, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const GSC_STORAGE_KEY = "ranklens_gsc_credentials";

function loadCredentials(): string | null {
  try {
    return localStorage.getItem(GSC_STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveCredentials(saJson: string) {
  localStorage.setItem(GSC_STORAGE_KEY, saJson);
}

function clearCredentials() {
  localStorage.removeItem(GSC_STORAGE_KEY);
}

export function isGscConnected(): boolean {
  return loadCredentials() !== null;
}

export function getGscCredentials(): string | null {
  return loadCredentials();
}

function extractEmail(saJson: string): string | null {
  try {
    const parsed = JSON.parse(saJson);
    return parsed.client_email || null;
  } catch {
    return null;
  }
}

export function GscConnectModal({
  open,
  onOpenChange,
  onConnected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected?: () => void;
}) {
  const [saJson, setSaJson] = useState("");
  const [connected, setConnected] = useState(false);
  const [saEmail, setSaEmail] = useState("");
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    if (!open) return;
    const creds = loadCredentials();
    if (creds) {
      setConnected(true);
      setSaJson(creds);
      setSaEmail(extractEmail(creds) || "");
    } else {
      setConnected(false);
      setSaJson("");
      setSaEmail("");
    }
    setShowJson(false);
  }, [open]);

  const handleConnect = () => {
    if (!saJson.trim()) {
      toast.error("Service account JSON key is required.");
      return;
    }
    try {
      const parsed = JSON.parse(saJson.trim());
      if (!parsed.client_email || !parsed.private_key) {
        toast.error("JSON must contain 'client_email' and 'private_key' fields.");
        return;
      }
      if (!parsed.private_key.includes("-----BEGIN PRIVATE KEY-----")) {
        toast.error("Invalid private key format in the JSON.");
        return;
      }
    } catch {
      toast.error("Invalid JSON format. Please paste the full service account key JSON.");
      return;
    }
    saveCredentials(saJson.trim());
    setConnected(true);
    setSaEmail(extractEmail(saJson.trim()) || "");
    toast.success("Google service account connected!");
    onConnected?.();
    onOpenChange(false);
  };

  const handleDisconnect = () => {
    clearCredentials();
    setConnected(false);
    setSaJson("");
    setSaEmail("");
    toast.success("Disconnected Google service account.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-card/95 backdrop-blur-xl border-cyan-500/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-cyan-400">
            <Globe className="w-5 h-5" />
            Google Search Console
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Connect a Google service account to submit URLs via the Google Indexing API.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {connected ? (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Connected</p>
                <p className="text-xs text-muted-foreground truncate">{saEmail}</p>
              </div>
              <Button size="sm" variant="outline" onClick={handleDisconnect} className="text-red-400 text-xs shrink-0">
                <XCircle className="h-3 w-3 mr-1" /> Disconnect
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-muted-foreground space-y-2">
                <p className="font-medium text-amber-400">Setup Instructions</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline inline-flex items-center gap-1">Google Cloud Console <ExternalLink className="h-3 w-3 inline" /></a></li>
                  <li>Create a project or select an existing one</li>
                  <li>Enable the <strong>Google Indexing API</strong></li>
                  <li>Go to <strong>APIs &amp; Services → Credentials</strong></li>
                  <li>Create a <strong>Service Account</strong></li>
                  <li>Download the <strong>JSON key</strong> for the service account</li>
                  <li>Paste the full JSON below</li>
                </ol>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Service Account JSON Key</label>
                <div className="relative">
                  <textarea
                    value={saJson}
                    onChange={(e) => setSaJson(e.target.value)}
                    placeholder='{"type": "service_account", "project_id": "...", ...}'
                    rows={8}
                    className="w-full rounded-lg border border-white/10 bg-muted/40 px-3 py-2 font-mono text-xs text-foreground focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500 outline-none resize-y"
                    style={{ WebkitTextSecurity: showJson ? "none" : "disc" } as any}
                  />
                  <button
                    onClick={() => setShowJson(!showJson)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
                    type="button"
                  >
                    {showJson ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {!connected && (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleConnect} className="gap-2">
              <Globe className="h-4 w-4" /> Connect
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
