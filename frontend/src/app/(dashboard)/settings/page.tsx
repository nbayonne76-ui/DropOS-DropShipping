"use client";

import { useState, type FormEvent } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAppStore } from "@/store/appStore";
import { useAuth } from "@/hooks/useAuth";
import { updateMe } from "@/lib/api/auth";
import { PLAN_LABELS } from "@/lib/constants";
import type { User } from "@/types/api";

export default function SettingsPage() {
  const { user, mutate } = useAuth();
  const storeUser = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);

  const displayUser = user ?? storeUser;

  // Profile form state
  const [fullName, setFullName] = useState(displayUser?.full_name ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password form state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  async function handleProfileSave(e: FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    setProfileSaving(true);
    try {
      const updated = await updateMe({ full_name: fullName });
      setUser(updated);
      await mutate();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      await updateMe({ password: newPassword });
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  }

  const planLabel = PLAN_LABELS[displayUser?.plan ?? "free"] ?? "Free";

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" subtitle="Manage your account" />

      {/* Profile */}
      <Card title="Profile" subtitle="Update your display name and email">
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label htmlFor="full_name" className="label-base">Full name</label>
            <input
              id="full_name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input-base"
            />
          </div>
          <div>
            <label className="label-base">Email address</label>
            <input
              type="email"
              value={displayUser?.email ?? ""}
              disabled
              className="input-base opacity-60 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-neutral-400">
              Email address cannot be changed.
            </p>
          </div>

          {profileError && (
            <p className="text-sm text-danger-600 bg-danger-50 rounded-lg px-3 py-2">{profileError}</p>
          )}
          {profileSuccess && (
            <p className="text-sm text-success-600 bg-success-50 rounded-lg px-3 py-2">
              Profile updated successfully.
            </p>
          )}

          <Button type="submit" loading={profileSaving}>
            Save changes
          </Button>
        </form>
      </Card>

      {/* Password */}
      <Card title="Change Password" subtitle="Choose a new secure password">
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label htmlFor="new_password" className="label-base">New password</label>
            <input
              id="new_password"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="input-base"
            />
          </div>
          <div>
            <label htmlFor="confirm_password" className="label-base">Confirm new password</label>
            <input
              id="confirm_password"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="input-base"
            />
          </div>

          {passwordError && (
            <p className="text-sm text-danger-600 bg-danger-50 rounded-lg px-3 py-2">{passwordError}</p>
          )}
          {passwordSuccess && (
            <p className="text-sm text-success-600 bg-success-50 rounded-lg px-3 py-2">
              Password changed successfully.
            </p>
          )}

          <Button type="submit" loading={passwordSaving}>
            Change password
          </Button>
        </form>
      </Card>

      {/* Plan */}
      <Card
        title="Current Plan"
        subtitle="Your subscription and billing details"
        action={
          <Badge variant="info">{planLabel}</Badge>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-neutral-600">
            You are on the <span className="font-semibold">{planLabel}</span> plan.
          </p>
          {displayUser?.plan === "free" && (
            <div className="rounded-lg bg-primary-50 border border-primary-200 px-4 py-3">
              <p className="text-sm text-primary-700 font-medium mb-1">
                Upgrade to unlock more features
              </p>
              <p className="text-xs text-primary-600">
                Starter, Growth, and Scale plans include higher order limits,
                advanced analytics, and multi-user access.
              </p>
            </div>
          )}
          <Button variant="secondary" size="sm">
            {displayUser?.plan === "free" ? "Upgrade plan" : "Manage billing"}
          </Button>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card title="Danger Zone">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-900">Delete account</p>
            <p className="text-xs text-neutral-500 mt-0.5">
              Permanently delete your account and all associated data.
            </p>
          </div>
          <Button variant="danger" size="sm">
            Delete account
          </Button>
        </div>
      </Card>
    </div>
  );
}
