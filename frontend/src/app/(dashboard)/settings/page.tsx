"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Plus, Trash2, UserMinus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAppStore } from "@/store/appStore";
import { useAuth } from "@/hooks/useAuth";
import { updateMe } from "@/lib/api/auth";
import { PLAN_LABELS, PLAN_COLORS } from "@/lib/constants";
import {
  listAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
} from "@/lib/api/notifications";
import { listTeamMembers, inviteMember, updateMemberRole, removeMember } from "@/lib/api/team";
import { listApiKeys, createApiKey, revokeApiKey } from "@/lib/api/apiKeys";
import { useStores } from "@/hooks/useStores";
import type { AlertRule, AlertType, ApiKey, ApiKeyCreated, TeamMember } from "@/types/api";

// ─── Common timezones ─────────────────────────────────────────────────────────

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  margin_below: "Profit margin below threshold",
  sync_failed: "Store sync failed",
  fulfillment_error: "Unfulfilled paid orders (24h+)",
  stock_below: "Product stock below threshold",
};

// ─── Password strength hint ────────────────────────────────────────────────────

function PasswordHints({ password }: { password: string }) {
  if (!password) return null;
  const rules = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "One uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "One digit", ok: /\d/.test(password) },
  ];
  return (
    <ul className="mt-1.5 space-y-0.5">
      {rules.map((r) => (
        <li key={r.label} className={`flex items-center gap-1.5 text-xs ${r.ok ? "text-success-600" : "text-neutral-400"}`}>
          <Check className={`w-3 h-3 ${r.ok ? "opacity-100" : "opacity-0"}`} />
          {r.label}
        </li>
      ))}
    </ul>
  );
}

// ─── Alert Rules Section ──────────────────────────────────────────────────────

function AlertRulesSection() {
  const { stores } = useStores();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  // New rule form state
  const [alertType, setAlertType] = useState<AlertType>("margin_below");
  const [storeId, setStoreId] = useState<string>("");
  const [threshold, setThreshold] = useState<string>("20");
  const [windowDays, setWindowDays] = useState<string>("7");

  useEffect(() => {
    listAlertRules()
      .then(setRules)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setFormSaving(true);
    try {
      const created = await createAlertRule({
        alert_type: alertType,
        store_id: storeId || null,
        threshold: (alertType === "margin_below" || alertType === "stock_below") ? Number(threshold) : null,
        window_days: Number(windowDays),
        is_active: true,
      });
      setRules((prev) => [created, ...prev]);
      setShowForm(false);
      // reset form
      setAlertType("margin_below");
      setStoreId("");
      setThreshold("20");
      setWindowDays("7");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create alert rule");
    } finally {
      setFormSaving(false);
    }
  }

  async function handleToggle(rule: AlertRule) {
    try {
      const updated = await updateAlertRule(rule.id, { is_active: !rule.is_active });
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
    } catch { /* ignore */ }
  }

  async function handleDelete(ruleId: string) {
    try {
      await deleteAlertRule(ruleId);
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch { /* ignore */ }
  }

  return (
    <Card
      title="Alert Rules"
      subtitle="Get notified automatically when key metrics cross thresholds"
      action={
        <Button size="sm" variant="secondary" onClick={() => setShowForm((v) => !v)}>
          <Plus className="w-4 h-4 mr-1" />
          New rule
        </Button>
      }
    >
      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 p-4 rounded-xl border border-neutral-200 bg-neutral-50 space-y-4">
          <p className="text-sm font-medium text-neutral-900">New alert rule</p>

          <div>
            <label className="label-base">Alert type</label>
            <select
              value={alertType}
              onChange={(e) => setAlertType(e.target.value as AlertType)}
              className="input-base"
            >
              {(Object.entries(ALERT_TYPE_LABELS) as [AlertType, string][]).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-base">Store (optional — leave blank for all stores)</label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="input-base"
            >
              <option value="">All stores</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {(alertType === "margin_below" || alertType === "stock_below") && (
            <>
              <div>
                <label className="label-base">
                  {alertType === "margin_below" ? "Threshold (%)" : "Threshold (units)"}
                </label>
                <input
                  type="number"
                  min={0}
                  max={alertType === "margin_below" ? 100 : undefined}
                  step={alertType === "margin_below" ? 0.1 : 1}
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="input-base"
                  placeholder={alertType === "margin_below" ? "e.g. 20" : "e.g. 5"}
                />
                <p className="mt-1 text-xs text-neutral-400">
                  {alertType === "margin_below"
                    ? "Fire when average margin falls below this value."
                    : "Fire when any variant's stock falls below this unit count."}
                </p>
              </div>
              {alertType === "margin_below" && (
                <div>
                  <label className="label-base">Window (days)</label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={windowDays}
                    onChange={(e) => setWindowDays(e.target.value)}
                    className="input-base"
                    placeholder="7"
                  />
                </div>
              )}
            </>
          )}

          {formError && (
            <p className="text-sm text-danger-600 bg-danger-50 rounded-lg px-3 py-2">{formError}</p>
          )}

          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={formSaving}>Create rule</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Rules list */}
      {loading ? (
        <p className="text-sm text-neutral-400 py-4">Loading…</p>
      ) : rules.length === 0 ? (
        <p className="text-sm text-neutral-400 py-4">
          No alert rules yet. Create one to get notified when something goes wrong.
        </p>
      ) : (
        <div className="divide-y divide-neutral-100">
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-start justify-between py-3 gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-neutral-900">
                    {ALERT_TYPE_LABELS[rule.alert_type as AlertType] ?? rule.alert_type}
                  </span>
                  <Badge variant={rule.is_active ? "success" : "neutral"}>
                    {rule.is_active ? "Active" : "Paused"}
                  </Badge>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {rule.store_id
                    ? `Store: ${stores.find((s) => s.id === rule.store_id)?.name ?? rule.store_id}`
                    : "All stores"}
                  {rule.alert_type === "margin_below" && rule.threshold != null
                    ? ` · Threshold: ${rule.threshold}% · Window: ${rule.window_days}d`
                    : rule.alert_type === "stock_below" && rule.threshold != null
                    ? ` · Below: ${rule.threshold} units`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggle(rule)}
                >
                  {rule.is_active ? "Pause" : "Activate"}
                </Button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                  aria-label="Delete rule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Team Section ─────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  viewer: "Viewer",
};

const ROLE_BADGE: Record<string, "info" | "warning" | "neutral"> = {
  owner: "info",
  admin: "warning",
  viewer: "neutral",
};

function TeamSection({ currentPlan }: { currentPlan: string }) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [planError, setPlanError] = useState(false);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "viewer">("viewer");
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const isPaid = currentPlan !== "free";

  useEffect(() => {
    if (!isPaid) return;
    listTeamMembers()
      .then(setMembers)
      .catch(() => setPlanError(true))
      .finally(() => setLoading(false));
  }, [isPaid]);

  async function handleInvite(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setInviteError(null);
    setInviteSaving(true);
    try {
      const added = await inviteMember({ email: inviteEmail.trim(), role: inviteRole });
      setMembers((prev) => [...prev, added]);
      setShowInvite(false);
      setInviteEmail("");
      setInviteRole("viewer");
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to invite member");
    } finally {
      setInviteSaving(false);
    }
  }

  async function handleRoleChange(member: TeamMember, newRole: "admin" | "viewer") {
    try {
      const updated = await updateMemberRole(member.id, { role: newRole });
      setMembers((prev) => prev.map((m) => (m.id === member.id ? updated : m)));
    } catch { /* ignore */ }
  }

  async function handleRemove(memberId: string) {
    try {
      await removeMember(memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch { /* ignore */ }
  }

  if (!isPaid) {
    return (
      <Card title="Team Members" subtitle="Collaborate with your team">
        <div className="rounded-lg bg-primary-50 border border-primary-200 px-4 py-4 space-y-2">
          <p className="text-sm font-medium text-primary-700">Upgrade to add team members</p>
          <p className="text-xs text-primary-600">
            Team management is available on the Starter plan and above.
            Multiple people can access the same account with role-based permissions.
          </p>
          <Button size="sm" onClick={() => window.location.href = "/billing"}>
            Upgrade plan
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Team Members"
      subtitle="Manage who has access to your DropOS account"
      action={
        <Button size="sm" variant="secondary" onClick={() => setShowInvite((v) => !v)}>
          <Plus className="w-4 h-4 mr-1" />
          Invite
        </Button>
      }
    >
      {/* Invite form */}
      {showInvite && (
        <form onSubmit={handleInvite} className="mb-6 p-4 rounded-xl border border-neutral-200 bg-neutral-50 space-y-4">
          <p className="text-sm font-medium text-neutral-900">Invite team member</p>
          <div>
            <label className="label-base">Email address</label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="input-base"
            />
            <p className="mt-1 text-xs text-neutral-400">
              The person must already have a DropOS account.
            </p>
          </div>
          <div>
            <label className="label-base">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "admin" | "viewer")}
              className="input-base"
            >
              <option value="viewer">Viewer — read-only access</option>
              <option value="admin">Admin — full access (except billing)</option>
            </select>
          </div>
          {inviteError && (
            <p className="text-sm text-danger-600 bg-danger-50 rounded-lg px-3 py-2">{inviteError}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={inviteSaving}>Send invite</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowInvite(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Members list */}
      {loading ? (
        <p className="text-sm text-neutral-400 py-4">Loading…</p>
      ) : planError ? (
        <p className="text-sm text-danger-500 py-4">Failed to load team members.</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-neutral-400 py-4">
          No team members yet. Invite someone to collaborate.
        </p>
      ) : (
        <div className="divide-y divide-neutral-100">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between py-3 gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {member.full_name ?? member.email}
                  </p>
                  <Badge variant={ROLE_BADGE[member.role] ?? "neutral"}>
                    {ROLE_LABELS[member.role] ?? member.role}
                  </Badge>
                </div>
                <p className="text-xs text-neutral-500 truncate">{member.email}</p>
              </div>

              {member.role !== "owner" && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member, e.target.value as "admin" | "viewer")}
                    className="text-xs border border-neutral-200 rounded-lg px-2 py-1 bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={() => handleRemove(member.id)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                    aria-label="Remove member"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// ─── API Keys Section ─────────────────────────────────────────────────────────

function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    listApiKeys()
      .then(setKeys)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const created = await createApiKey({ name: keyName.trim() });
      setKeys((prev) => [created, ...prev]);
      setNewKey(created);
      setShowForm(false);
      setKeyName("");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    try {
      await revokeApiKey(keyId);
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
      if (newKey?.id === keyId) setNewKey(null);
    } catch { /* ignore */ }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Card
      title="API Keys"
      subtitle="Authenticate external tools with X-API-Key header"
      action={
        <Button size="sm" variant="secondary" onClick={() => setShowForm((v) => !v)}>
          <Plus className="w-4 h-4 mr-1" />
          New key
        </Button>
      }
    >
      {/* One-time reveal banner */}
      {newKey && (
        <div className="mb-6 p-4 rounded-xl border border-success-200 bg-success-50 space-y-2">
          <p className="text-sm font-semibold text-success-800">
            Copy your key now — it won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white border border-success-200 rounded-lg px-3 py-2 font-mono truncate text-success-900">
              {newKey.raw_key}
            </code>
            <Button size="sm" variant="secondary" onClick={() => handleCopy(newKey.raw_key)}>
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="text-xs text-success-600 hover:underline"
          >
            I&apos;ve saved it — dismiss
          </button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 p-4 rounded-xl border border-neutral-200 bg-neutral-50 space-y-4">
          <p className="text-sm font-medium text-neutral-900">New API key</p>
          <div>
            <label className="label-base">Key name</label>
            <input
              type="text"
              required
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="e.g. Zapier integration"
              className="input-base"
            />
          </div>
          {createError && (
            <p className="text-sm text-danger-600 bg-danger-50 rounded-lg px-3 py-2">{createError}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={creating}>Create</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Keys list */}
      {loading ? (
        <p className="text-sm text-neutral-400 py-4">Loading…</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-neutral-400 py-4">
          No API keys yet. Create one to integrate external tools.
        </p>
      ) : (
        <div className="divide-y divide-neutral-100">
          {keys.map((key) => (
            <div key={key.id} className="flex items-center justify-between py-3 gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-900">{key.name}</p>
                <p className="text-xs text-neutral-500 font-mono mt-0.5">
                  {key.prefix}••••••••••••
                  {key.last_used_at && (
                    <span className="ml-2 font-sans">
                      · Last used {new Date(key.last_used_at).toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => handleRevoke(key.id)}
                className="flex-shrink-0 p-1.5 rounded-lg text-neutral-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                aria-label="Revoke key"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-neutral-400">
        Pass the key as an <code className="font-mono">X-API-Key</code> header in your requests.
      </p>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "alerts", label: "Alerts" },
  { id: "team", label: "Team" },
  { id: "api-keys", label: "API Keys" },
];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "profile";
  const [activeTab, setActiveTab] = useState(initialTab);

  const { user, mutate } = useAuth();
  const storeUser = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);

  const displayUser = user ?? storeUser;

  // ── Profile form ────────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState(displayUser?.full_name ?? "");
  const [timezone, setTimezone] = useState(displayUser?.timezone ?? "UTC");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  useEffect(() => {
    if (displayUser) {
      setFullName(displayUser.full_name ?? "");
      setTimezone(displayUser.timezone ?? "UTC");
    }
  }, [displayUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleProfileSave(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    setProfileSaving(true);
    try {
      const updated = await updateMe({
        full_name: fullName.trim() || null,
        timezone,
      });
      setUser(updated);
      mutate();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setProfileSaving(false);
    }
  }

  // ── Password form ───────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  async function handlePasswordChange(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setPasswordError("New password must contain at least one uppercase letter.");
      return;
    }
    if (!/\d/.test(newPassword)) {
      setPasswordError("New password must contain at least one digit.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      await updateMe({ current_password: currentPassword, new_password: newPassword });
      setCurrentPassword("");
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

  const planKey = displayUser?.plan ?? "free";
  const planLabel = PLAN_LABELS[planKey] ?? "Free";
  const planVariant = (PLAN_COLORS[planKey] ?? "neutral") as "success" | "warning" | "info" | "neutral";

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" subtitle="Manage your account and alert rules" />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-neutral-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {activeTab === "profile" && (
        <>
          <Card title="Profile" subtitle="Update your display name and timezone">
            <form onSubmit={handleProfileSave} className="space-y-4">
              <div>
                <label htmlFor="full_name" className="label-base">Full name</label>
                <input
                  id="full_name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
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
                <p className="mt-1 text-xs text-neutral-400">Email cannot be changed.</p>
              </div>

              <div>
                <label htmlFor="timezone" className="label-base">Timezone</label>
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="input-base"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>

              {profileError && (
                <p className="text-sm text-danger-600 bg-danger-50 rounded-lg px-3 py-2">{profileError}</p>
              )}
              {profileSuccess && (
                <p className="text-sm text-success-600 bg-success-50 rounded-lg px-3 py-2">
                  Profile updated successfully.
                </p>
              )}

              <Button type="submit" loading={profileSaving}>Save changes</Button>
            </form>
          </Card>

          <Card title="Change Password" subtitle="Requires your current password">
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label htmlFor="current_password" className="label-base">Current password</label>
                <input
                  id="current_password"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Your current password"
                  className="input-base"
                />
              </div>

              <div>
                <label htmlFor="new_password" className="label-base">New password</label>
                <input
                  id="new_password"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars, one uppercase, one digit"
                  className="input-base"
                />
                <PasswordHints password={newPassword} />
              </div>

              <div>
                <label htmlFor="confirm_password" className="label-base">Confirm new password</label>
                <input
                  id="confirm_password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="input-base"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="mt-1 text-xs text-danger-500">Passwords do not match.</p>
                )}
              </div>

              {passwordError && (
                <p className="text-sm text-danger-600 bg-danger-50 rounded-lg px-3 py-2">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-sm text-success-600 bg-success-50 rounded-lg px-3 py-2">
                  Password changed successfully.
                </p>
              )}

              <Button type="submit" loading={passwordSaving}>Change password</Button>
            </form>
          </Card>

          <Card
            title="Current Plan"
            subtitle="Your subscription and billing"
            action={<Badge variant={planVariant}>{planLabel}</Badge>}
          >
            <div className="space-y-3">
              <p className="text-sm text-neutral-600">
                You are on the <span className="font-semibold">{planLabel}</span> plan.
              </p>
              {planKey === "free" && (
                <div className="rounded-lg bg-primary-50 border border-primary-200 px-4 py-3">
                  <p className="text-sm text-primary-700 font-medium mb-1">Upgrade to unlock more features</p>
                  <p className="text-xs text-primary-600">
                    Starter, Growth, and Scale plans include higher order limits,
                    advanced analytics, and multi-user access.
                  </p>
                </div>
              )}
              <Button variant="secondary" size="sm">
                {planKey === "free" ? "Upgrade plan" : "Manage billing"}
              </Button>
            </div>
          </Card>

          <Card title="Danger Zone">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-900">Delete account</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Permanently delete your account and all associated data.
                </p>
              </div>
              <Button variant="danger" size="sm">Delete account</Button>
            </div>
          </Card>
        </>
      )}

      {/* Alerts tab */}
      {activeTab === "alerts" && <AlertRulesSection />}

      {/* Team tab */}
      {activeTab === "team" && <TeamSection currentPlan={planKey} />}

      {/* API Keys tab */}
      {activeTab === "api-keys" && <ApiKeysSection />}
    </div>
  );
}
