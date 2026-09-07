"use client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  MapPin,
  ArrowRight,
  LoaderCircle,
  Cloud,
  LockKeyhole,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase, CLOUD_MODE, authReturnUrl } from "@/lib/supabase";
import Homebase from "./homebase";
export default function AuthGate() {
  const [session, setSession] = useState<Session | null>(null),
    [ready, setReady] = useState(!CLOUD_MODE),
    [recovery, setRecovery] = useState(false),
    [mode, setMode] = useState("signin"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    if (!supabase) return;
    let live = true;
    const recoveryLink =
      new URLSearchParams(location.hash.slice(1)).get("type") === "recovery";
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      if (!live) return;
      setSession(next);
      setReady(true);
      if (
        event === "PASSWORD_RECOVERY" ||
        (event === "INITIAL_SESSION" && recoveryLink && next)
      )
        setRecovery(true);
      if (event === "SIGNED_OUT") {
        setPassword("");
        setRecovery(false);
        setError("");
        setNotice("");
      }
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!live) return;
      if (error) setError(error.message);
      setSession(data.session);
      setReady(true);
      if (recoveryLink && data.session) setRecovery(true);
    });
    return () => {
      live = false;
      subscription.unsubscribe();
    };
  }, []);
  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (recovery) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setPassword("");
        setRecovery(false);
        history.replaceState(null, "", authReturnUrl());
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: authReturnUrl(),
        });
        if (error) throw error;
        setNotice(
          "If this email has an account, a password reset link will arrive shortly.",
        );
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: authReturnUrl() },
        });
        if (error) throw error;
        setPassword("");
        if (!data.session)
          setNotice(
            "Check your email to confirm your account, then return here to sign in.",
          );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setPassword("");
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Sign-in failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!CLOUD_MODE) return <Homebase />;
  if (!ready)
    return (
      <main className="auth-page">
        <output className="auth-loading">
          <LoaderCircle className="spin" />
          Opening your Homebase…
        </output>
      </main>
    );
  if (session && !recovery)
    return <Homebase key={session.user.id} accountEmail={session.user.email} />;
  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-mark">
            <MapPin size={23} />
          </span>
          <div>
            <strong>
              homebase<span className="brand-dot">.</span>
            </strong>
            <small>BAY AREA</small>
          </div>
        </div>
        <p className="eyebrow">A PLACE FOR YOUR NEXT PLACE</p>
        <h1>
          {recovery
            ? "Choose a new password"
            : mode === "reset"
              ? "Let’s get you back in."
              : "Your shortlist, wherever you are."}
        </h1>
        <p className="auth-intro">
          Sign in to keep apartments, floor plans, and tour notes together
          across your devices.
        </p>
        {!recovery && (
          <Tabs
            value={mode === "reset" ? "signin" : mode}
            onValueChange={(v) => {
              setMode(String(v));
              setError("");
              setNotice("");
            }}
          >
            <TabsList className="view-tabs">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        <form onSubmit={submit}>
          {!recovery && (
            <label className="field" htmlFor="auth-email">
              <span>Email</span>
              <Input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
              />
            </label>
          )}
          {(recovery || mode !== "reset") && (
            <label className="field" htmlFor="auth-password">
              <span>{recovery ? "New password" : "Password"}</span>
              <Input
                id="auth-password"
                type="password"
                autoComplete={
                  mode === "signin" && !recovery
                    ? "current-password"
                    : "new-password"
                }
                minLength={mode === "signin" && !recovery ? 1 : 8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
              />
              {(recovery || mode === "signup") && (
                <small>Use at least 8 characters.</small>
              )}
            </label>
          )}
          {error && (
            <p role="alert" className="error-banner">
              {error}
            </p>
          )}
          {notice && <output className="auth-notice">{notice}</output>}
          <Button type="submit" disabled={busy} className="auth-submit">
            {busy ? <LoaderCircle className="spin" /> : <ArrowRight />}
            {busy
              ? "One moment…"
              : recovery
                ? "Save new password"
                : mode === "reset"
                  ? "Send reset link"
                  : mode === "signup"
                    ? "Create account"
                    : "Sign in"}
          </Button>
        </form>
        {!recovery && (
          <button
            className="auth-reset"
            onClick={() => {
              setMode(mode === "reset" ? "signin" : "reset");
              setError("");
              setNotice("");
            }}
          >
            {mode === "reset" ? "Back to sign in" : "Forgot your password?"}
          </button>
        )}
        <div className="auth-benefits">
          <span>
            <Cloud size={16} />
            Saved across devices
          </span>
          <span>
            <LockKeyhole size={16} />
            Your private shortlist
          </span>
        </div>
        <p className="auth-local-note">
          Already saved apartments here? You can import this browser’s shortlist
          after signing in.
        </p>
      </div>
    </main>
  );
}
