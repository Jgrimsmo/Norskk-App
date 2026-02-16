"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/auth-context";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { signIn, resetPassword, user } = useAuth();
  const { profile } = useCompanyProfile();
  const router = useRouter();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      await signIn(email, password);
      router.push("/");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to sign in";
      toast.error("Sign-in failed", { description: message });
    } finally {
      setPending(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Enter your email first", {
        description: "We'll send a password reset link to that address.",
      });
      return;
    }
    try {
      await resetPassword(email);
      toast.success("Reset email sent", {
        description: `Check ${email} for a password reset link.`,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not send reset email";
      toast.error("Reset failed", { description: message });
    }
  };

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Logo / Brand */}
      <div className="flex flex-col items-center gap-2">
        {profile?.logoUrl ? (
          <img
            src={profile.logoUrl}
            alt={profile.name || "Company logo"}
            className="h-16 w-auto object-contain invert dark:invert-0"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl">
            {(profile?.name ?? "N").charAt(0).toUpperCase()}
          </div>
        )}
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your {profile?.name || "Norskk"} account
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs text-primary hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account? Contact your company admin for an invite.
      </p>
    </div>
  );
}
