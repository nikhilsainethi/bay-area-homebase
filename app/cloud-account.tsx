"use client";
import { useEffect, useState } from "react";
import { CloudUpload, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { browserStore } from "@/lib/client";
import { importCloud } from "@/lib/cloud-store";
import { supabase } from "@/lib/supabase";
export function AccountButton({ email }: { email?: string }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="account-control">
      <span title={email}>{email}</span>
      <Button
        variant="ghost"
        disabled={busy}
        onClick={async () => {
          if (!supabase) return;
          setBusy(true);
          const { error } = await supabase.auth.signOut({ scope: "local" });
          if (error) setError(error.message);
          setBusy(false);
        }}
        aria-label="Sign out"
      >
        <LogOut />
      </Button>
      {error && <span role="alert">{error}</span>}
    </div>
  );
}
export function BrowserMigration({
  onChange,
  onNotice,
}: {
  onChange: () => Promise<void>;
  onNotice: (s: string) => void;
}) {
  const [count, setCount] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    void Promise.resolve().then(() => {
      try {
        setCount(browserStore().list().length);
      } catch {
        setError(
          "The browser shortlist could not be read. Use Export in the browser-only version to recover a backup.",
        );
      }
    });
  }, []);
  if (!count && !error) return null;
  return (
    <div className="migration-card">
      <strong>{count} properties saved in this browser</strong>
      <p>
        Copy them into your signed-in account. Your local copy stays here, and
        existing cloud records are kept.
      </p>
      <Button
        variant="outline"
        disabled={busy || !count}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const r = await importCloud(browserStore().list());
            await onChange();
            setCount(0);
            onNotice(
              `Copied ${r.added} properties; kept ${r.skipped} existing records`,
            );
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <CloudUpload />
        {busy ? "Copying…" : "Copy browser shortlist to account"}
      </Button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
