"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, Loader2, Mail, RefreshCw, Send, Trash2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TURNSTILE_SITE_KEY, Turnstile } from "@/components/ui/turnstile";

type Invite = { id: string; email: string; expires_at: string; used_at: string | null; created_at: string; emailSent?: boolean };
type Member = { user_id: string; accepted: boolean; joined_at: string | null; user?: { email?: string; full_name?: string } | null };
type Delegation = { id: string; name: string; owner_id?: string };
type DelegationData = { delegation: Delegation | null; delegations?: Delegation[] | null; invites: Invite[]; members: Member[]; canManage: boolean };

export default function DelegationPortalPage() {
  const [data, setData] = useState<DelegationData | null>(null);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [selectedDelegationId, setSelectedDelegationId] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [memberAction, setMemberAction] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);

  const load = async (delegationId?: string | null) => {
    const response = await fetch(`/api/delegations/invites${delegationId ? `?delegationId=${encodeURIComponent(delegationId)}` : ""}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || result.error || "Unable to load delegation.");
    const list: Delegation[] = Array.isArray(result.delegations) && result.delegations.length > 0
      ? result.delegations
      : result.delegation
        ? [result.delegation]
        : [];
    setDelegations(list);
    setSelectedDelegationId((current) => {
      if (delegationId && list.some((item) => item.id === delegationId)) return delegationId;
      if (current && list.some((item) => item.id === current)) return current;
      return list[0]?.id ?? null;
    });
    setData(result);
  };

  // Switching delegations must never show the previously selected delegation's members.
  const selectDelegation = (nextId: string) => {
    if (nextId === selectedDelegationId) return;
    setSelectedDelegationId(nextId);
    setSwitching(true);
    setMessage("");
    setData((current) => (current ? { ...current, delegation: null, members: [], invites: [], canManage: false } : current));
    load(nextId)
      .catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load delegation."))
      .finally(() => setSwitching(false));
  };

  useEffect(() => {
    // The initial request hydrates the client-side delegation workspace.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load delegation."));
  }, []);

  async function invite(event: FormEvent) {
    event.preventDefault();
    if (!turnstileToken) {
      setMessage("Please complete the security verification first.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/delegations/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken, ...(selectedDelegationId ? { delegationId: selectedDelegationId } : {}) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || result.error || "Unable to send invitation.");
      setEmail("");
      setTurnstileToken("");
      setTurnstileKey((key) => key + 1);
      setMessage(result.emailSent ? (result.resent ? "Invitation resent." : "Invitation sent.") : "Invitation saved, but delivery is pending.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send invitation.");
    } finally {
      setLoading(false);
    }
  }

  async function resend(inviteId: string) {
    if (!turnstileToken) {
      setMessage("Please complete the security verification first.");
      return;
    }
    setResendingId(inviteId);
    setMessage("");
    try {
      const response = await fetch("/api/delegations/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId, turnstileToken }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || result.error || "Unable to resend invitation.");
      setMessage(result.emailSent ? "Invitation resent." : "Invitation is still pending delivery.");
      setTurnstileToken("");
      setTurnstileKey((key) => key + 1);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to resend invitation.");
    } finally {
      setResendingId(null);
    }
  }

  async function updateMember(memberId: string, action: "accept" | "reject" | "remove") {
    setMemberAction(`${memberId}:${action}`);
    setMessage("");
    try {
      const response = await fetch("/api/delegation/change_accepted_status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_user_id: memberId, action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || result.error || "Unable to update delegation member.");
      setMessage(action === "accept" ? "Member approved." : action === "reject" ? "Member rejected." : "Member removed.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update delegation member.");
    } finally {
      setMemberAction(null);
    }
  }

  if (!data || switching) return <div className="mx-auto max-w-4xl space-y-6 p-5 sm:p-8"><Skeleton className="h-12 w-64 rounded-2xl bg-white/10" /><Skeleton className="h-64 w-full rounded-3xl bg-white/10" /><Skeleton className="h-48 w-full rounded-3xl bg-white/10" /></div>;

  return (
    <div className="mx-auto max-w-4xl p-5 sm:p-8">
      <div className="mb-9 flex items-center gap-4">
        <div className="rounded-2xl bg-[#7C3AED]/15 p-3 text-[#C4B5FD]"><Users className="h-6 w-6" /></div>
        <div><p className="text-sm text-[#C4B5FD]">Delegation workspace</p><h1 className="mt-1 text-3xl font-semibold">{data.delegation?.name || "My delegation"}</h1></div>
      </div>

      {delegations.length > 1 && (
        <div className="mb-6">
          <label htmlFor="delegation-switcher" className="block text-sm text-[#C3C7D1]">Delegation</label>
          <select
            id="delegation-switcher"
            value={selectedDelegationId || ""}
            onChange={(event) => selectDelegation(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-[#12101A] px-4 py-3 text-sm text-white outline-none focus:border-[#7C3AED]"
          >
            {delegations.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>
      )}

      {!data.delegation ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-[#12101A] p-10 text-center"><p className="text-[#C3C7D1]">Submit a Delegation application to invite members.</p></div>
      ) : (
        <>
          <section className="rounded-3xl border border-white/10 bg-[#12101A] p-6 sm:p-8">
            <h2 className="text-xl font-semibold">Delegation members</h2>
            <p className="mt-2 text-sm text-[#9CA3AF]">{data.canManage ? "Approve or reject members after they complete their Delegate applications." : "You are a member of this delegation. Membership is read-only."}</p>
            <div className="mt-5 divide-y divide-white/10">
              {data.members.map((member) => (
                <div key={member.user_id} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{member.user?.full_name || member.user?.email || "Delegation member"}</p>
                    <p className="text-xs text-[#9CA3AF]">{member.user?.email || ""}</p>
                  </div>
                  {data.canManage && (member.accepted ? (
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#86EFAC]/10 px-3 py-1 text-xs text-[#BBF7D0]">Accepted</span>
                      <Button variant="outline" size="sm" onClick={() => updateMember(member.user_id, "remove")} disabled={Boolean(memberAction)}>
                        {memberAction === `${member.user_id}:remove` ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="mr-2 h-4 w-4" />Remove</>}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#C4B5FD]/10 px-3 py-1 text-xs text-[#C4B5FD]">Awaiting approval</span>
                      <Button variant="outline" size="sm" onClick={() => updateMember(member.user_id, "reject")} disabled={Boolean(memberAction)}><X className="mr-2 h-4 w-4" />Reject</Button>
                      <Button size="sm" onClick={() => updateMember(member.user_id, "accept")} disabled={Boolean(memberAction)} className="bg-[#7C3AED] text-white hover:bg-[#6D28D9]">
                        {memberAction === `${member.user_id}:accept` ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-2 h-4 w-4" />Approve</>}
                      </Button>
                    </div>
                  ))}
                  {!data.canManage && <span className={`rounded-full px-3 py-1 text-xs ${member.accepted ? "bg-[#86EFAC]/10 text-[#BBF7D0]" : "bg-[#C4B5FD]/10 text-[#C4B5FD]"}`}>{member.accepted ? "Accepted" : "Awaiting approval"}</span>}
                </div>
              ))}
              {data.members.length === 0 && <p className="py-5 text-sm text-[#9CA3AF]">No members have joined yet.</p>}
            </div>
            {message && <p className="mt-4 text-sm text-[#C4B5FD]" role="status">{message}</p>}
          </section>

          {data.canManage && <>
            <section className="mt-6 rounded-3xl border border-white/10 bg-[#12101A] p-6 sm:p-8">
              <h2 className="text-xl font-semibold">Invite a member</h2>
              <p className="mt-2 text-sm text-[#9CA3AF]">Each member verifies their own email and completes an individual Delegate application.</p>
              <form onSubmit={invite} className="mt-6 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1"><Mail className="absolute left-3 top-3 h-4 w-4 text-[#9CA3AF]" /><Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="member@example.com" className="border-white/10 bg-black/20 pl-10 text-white" /></div>
                <Button type="submit" disabled={loading || !turnstileToken} className="bg-[#7C3AED] text-white hover:bg-[#6D28D9]"><Send className="mr-2 h-4 w-4" />Send invitation</Button>
              </form>
              {TURNSTILE_SITE_KEY ? <div className="mt-5"><p className="mb-2 text-sm text-[#C3C7D1]">Security check</p><Turnstile key={turnstileKey} siteKey={TURNSTILE_SITE_KEY} onVerify={setTurnstileToken} onError={() => setTurnstileToken("")} onExpire={() => setTurnstileToken("")} /></div> : <p className="mt-4 text-sm text-rose-300">Security verification is not configured.</p>}
            </section>
            <section className="mt-6 rounded-3xl border border-white/10 bg-[#12101A] p-6 sm:p-8">
              <h2 className="text-xl font-semibold">Invitations</h2>
              <div className="mt-5 divide-y divide-white/10">
                {data.invites.map((invite) => <div key={invite.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"><div><p className="font-medium">{invite.email}</p><p className="text-xs text-[#9CA3AF]">{invite.emailSent ? "Email sent" : "Delivery pending"} · Expires {new Date(invite.expires_at).toLocaleDateString("en-GB")}</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs ${invite.used_at ? "bg-[#86EFAC]/10 text-[#BBF7D0]" : "bg-[#C4B5FD]/10 text-[#C4B5FD]"}`}>{invite.used_at ? "Application linked" : "Awaiting member"}</span>{!invite.used_at && <Button variant="outline" size="sm" onClick={() => resend(invite.id)} disabled={resendingId === invite.id || !turnstileToken}><RefreshCw className={`mr-2 h-3.5 w-3.5 ${resendingId === invite.id ? "animate-spin" : ""}`} />Resend</Button>}</div></div>)}
                {data.invites.length === 0 && <p className="py-6 text-sm text-[#9CA3AF]">No invitations yet.</p>}
              </div>
            </section>
          </>}
        </>
      )}
    </div>
  );
}
