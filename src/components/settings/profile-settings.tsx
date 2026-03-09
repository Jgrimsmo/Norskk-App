"use client";

import * as React from "react";
import { User, KeyRound, Loader2, Check } from "lucide-react";
import {
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/firebase/auth-context";

export function ProfileSettings() {
  const { user } = useAuth();

  // ── Display name ──
  const [displayName, setDisplayName] = React.useState(
    user?.displayName ?? ""
  );
  const [namePending, setNamePending] = React.useState(false);

  const handleSaveName = async () => {
    if (!user) return;
    if (!displayName.trim()) {
      toast.error("Display name cannot be empty");
      return;
    }
    setNamePending(true);
    try {
      await updateProfile(user, { displayName: displayName.trim() });
      toast.success("Display name updated");
    } catch {
      toast.error("Failed to update display name");
    } finally {
      setNamePending(false);
    }
  };

  // ── Password change ──
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [pwPending, setPwPending] = React.useState(false);

  const handleChangePassword = async () => {
    if (!user || !user.email) return;
    if (!currentPassword) {
      toast.error("Enter your current password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setPwPending(true);
    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        toast.error("Current password is incorrect");
      } else {
        toast.error("Failed to change password");
      }
    } finally {
      setPwPending(false);
    }
  };

  if (!user) return null;

  const initials = (user.displayName || user.email || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <User className="h-5 w-5" />
          My Profile
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Update your display name and account password.
        </p>
      </div>

      <Separator />

      {/* Avatar placeholder */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xl select-none">
          {initials}
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">
            {user.displayName || "—"}
          </span>
          <span className="text-xs text-muted-foreground">{user.email}</span>
        </div>
      </div>

      {/* Display name */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Display Name</h3>
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Full name</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="h-9 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
              }}
            />
          </div>
          <Button
            size="sm"
            onClick={handleSaveName}
            disabled={
              namePending || displayName.trim() === (user.displayName ?? "")
            }
            className="gap-1.5 cursor-pointer"
          >
            {namePending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Save
          </Button>
        </div>
      </div>

      <Separator />

      {/* Password change */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <KeyRound className="h-4 w-4" />
          Change Password
        </h3>
        <p className="text-xs text-muted-foreground">
          You will need to re-enter your current password to set a new one.
        </p>
        <div className="space-y-2.5">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Current password
            </Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="h-9 text-sm"
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              New password
            </Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="h-9 text-sm"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Confirm new password
            </Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="h-9 text-sm"
              autoComplete="new-password"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleChangePassword();
              }}
            />
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleChangePassword}
          disabled={
            pwPending || !currentPassword || !newPassword || !confirmPassword
          }
          className="gap-1.5 cursor-pointer"
        >
          {pwPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <KeyRound className="h-3.5 w-3.5" />
          )}
          Update Password
        </Button>
      </div>
    </div>
  );
}
