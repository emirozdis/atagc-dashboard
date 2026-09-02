"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, Send, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TURNSTILE_SITE_KEY, Turnstile } from "@/components/ui/turnstile";
import { RAVENMUN_APPLICATION_CARDS, RavenApplicationType } from "@/config/ravenmun";
import RavenPublicShell from "@/components/raven/RavenPublicShell";
import { countWords, essayMinWords, essayWordCountError, isEssayQuestion } from "@/lib/application-essays";

export type RavenApplicationQuestion = {
  id: string;
  label: string;
  type: "text" | "number" | "tel" | "email" | "date" | "textarea" | "url" | "checkbox" | "select";
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  minWords?: number;
};

type RavenApplicationOption = { value: string; label: string };
type PriorApplication = { submitted_at?: string | null; form_data?: Record<string, unknown> | null };

export type RavenInitialForm = {
  title: string;
  questions: unknown[];
  committeeOptions: RavenApplicationOption[];
};

function titleFor(type: string) {
  return RAVENMUN_APPLICATION_CARDS.find((card) => card.type === type)?.title || "Application";
}

const GRADE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "prep", label: "Preparation" },
  { value: "9", label: "9th Grade" },
  { value: "10", label: "10th Grade" },
  { value: "11", label: "11th Grade" },
  { value: "12", label: "12th Grade" },
  { value: "university", label: "Graduate" },
];

const AUTOFILL_GROUPS = [
  ["fullName", "full_name", "name", "applicantName", "applicant_name", "adSoyad"],
  ["email", "eMail", "emailAddress", "email_address"],
  ["phone", "phoneNumber", "phone_number", "telephone", "mobile", "telefon"],
  ["birthDate", "birth_date", "dateOfBirth", "date_of_birth", "dob"],
  ["school", "schoolName", "school_name", "schoolOrOrganization", "school_or_organization", "highSchool", "high_school", "manual_school_name"],
  ["high_school_id"],
  ["city", "cityName", "city_name", "sehir", "şehir"],
  ["grade", "gradeOrYear", "grade_or_year", "year", "schoolYear", "school_year"],
];

const NON_AUTOFILL_FIELDS = new Set(["committeePreferences", "choice1", "choice2", "choice3"]);

function hasValue(value: unknown) {
  return (typeof value === "string" && value.trim().length > 0) || typeof value === "number" || typeof value === "boolean";
}

function normalizedFieldId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildPriorValues(applications: PriorApplication[]) {
  const values: Record<string, unknown> = {};
  const sortedApplications = [...applications].sort((left, right) => {
    const leftDate = left.submitted_at ? Date.parse(left.submitted_at) : 0;
    const rightDate = right.submitted_at ? Date.parse(right.submitted_at) : 0;
    return rightDate - leftDate;
  });

  for (const application of sortedApplications) {
    if (!application.form_data) continue;
    for (const [key, value] of Object.entries(application.form_data)) {
      if (hasValue(value) && !hasValue(values[key])) values[key] = value;
    }
  }
  return values;
}

function findPriorValue(questionId: string, priorValues: Record<string, unknown>) {
  if (NON_AUTOFILL_FIELDS.has(questionId)) return undefined;
  if (hasValue(priorValues[questionId])) return priorValues[questionId];

  const normalizedQuestionId = normalizedFieldId(questionId);
  const group = AUTOFILL_GROUPS.find((fields) => fields.some((field) => normalizedFieldId(field) === normalizedQuestionId));
  if (!group) return undefined;

  for (const field of group) {
    const value = Object.entries(priorValues).find(([key, candidate]) => normalizedFieldId(key) === normalizedFieldId(field) && hasValue(candidate))?.[1];
    if (hasValue(value)) return value;
  }
  return undefined;
}

function normalizeDraft(draft: Record<string, unknown>) {
  const normalizedDraft = { ...draft };
  const legacyPreferences = normalizedDraft.committeePreferences;
  delete normalizedDraft.committeePreferences;
  if (Array.isArray(legacyPreferences)) {
    legacyPreferences.slice(0, 3).forEach((preference, index) => {
      if (typeof preference === "string") normalizedDraft[`choice${index + 1}`] = preference;
    });
  }
  return normalizedDraft;
}

function normalizeQuestions(rawQuestions: unknown[], committeeOptions: RavenApplicationOption[]) {
  const questions: RavenApplicationQuestion[] = [];
  for (const raw of rawQuestions) {
    if (!raw || typeof raw !== "object") continue;
    const question = raw as RavenApplicationQuestion;
    if (question.id === "committeePreferences") {
      [1, 2, 3].forEach((position) => questions.push({
        ...question,
        id: `choice${position}`,
        label: `${position}. Committee Choice`,
        type: "select",
        required: position === 1,
        options: committeeOptions,
      }));
      continue;
    }
    if (question.id === "grade") {
      questions.push({ ...question, label: "Grade", type: "select", options: GRADE_OPTIONS });
      continue;
    }
    if (/^choice[123]$/.test(question.id)) {
      questions.push({ ...question, type: "select", options: committeeOptions });
      continue;
    }
    questions.push({ ...question, label: String(question.label || "").replace(/organisation/gi, "organization") });
  }
  return questions;
}

export default function RavenApplicationForm({ applicationType, initialForm }: { applicationType: RavenApplicationType; initialForm: RavenInitialForm }) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const initialQuestions = useMemo(() => normalizeQuestions(initialForm.questions, initialForm.committeeOptions), [initialForm]);
  const [questions] = useState<RavenApplicationQuestion[]>(initialQuestions);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const storageKey = `ravenmun_application_${applicationType}`;
  const requiredQuestions = questions.filter((question) => question.required);
  const emailFieldId = useMemo(() => questions.find((question) => question.type === "email")?.id || "email", [questions]);

  useEffect(() => {
    let cancelled = false;

    async function restoreForm() {
      const stored = window.localStorage.getItem(storageKey);
      let draft: Record<string, unknown> = {};
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) draft = parsed as Record<string, unknown>;
        } catch {
          window.localStorage.removeItem(storageKey);
        }
      }

      let priorApplications: PriorApplication[] = [];
      if (sessionStatus === "authenticated") {
        try {
          const response = await fetch("/api/applications/mine");
          if (response.ok) {
            const result = await response.json() as { applications?: PriorApplication[] };
            priorApplications = Array.isArray(result.applications) ? result.applications : [];
          }
        } catch {
          // A prior application is an enhancement; the local draft remains usable if it cannot be loaded.
        }
      }
      if (cancelled) return;

      const normalizedDraft = normalizeDraft(draft);
      const priorValues = buildPriorValues(priorApplications);
      const restored: Record<string, unknown> = {};
      for (const question of questions) {
        if (Object.prototype.hasOwnProperty.call(normalizedDraft, question.id)) {
          restored[question.id] = normalizedDraft[question.id];
          continue;
        }
        const priorValue = findPriorValue(question.id, priorValues);
        if (priorValue !== undefined) restored[question.id] = priorValue;
      }

      const nameQuestion = questions.find((question) => question.id === "fullName");
      if (nameQuestion && !hasValue(restored[nameQuestion.id])) restored[nameQuestion.id] = session?.user?.name || findPriorValue("fullName", priorValues) || "";
      if (!hasValue(restored[emailFieldId])) restored[emailFieldId] = session?.user?.email || findPriorValue(emailFieldId, priorValues) || "";

      // The build-rendered form is available immediately; this only restores a local draft and prior account data.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(restored);
    }

    void restoreForm();
    return () => { cancelled = true; };
  }, [emailFieldId, questions, session?.user?.email, session?.user?.id, session?.user?.name, sessionStatus, storageKey]);

  function updateField(id: string, value: unknown) {
    setFormData((current) => {
      const next = { ...current, [id]: value };
      if (typeof window !== "undefined") window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }

  function validate() {
    const missing = requiredQuestions.filter((question) => formData[question.id] === undefined || formData[question.id] === "" || formData[question.id] === false);
    if (missing.length) {
      setMessage(`Please complete: ${missing.map((question) => question.label).join(", ")}`);
      return false;
    }
    if (typeof formData[emailFieldId] !== "string" || !formData[emailFieldId].includes("@")) {
      setMessage("Please enter a valid email address.");
      return false;
    }
    for (const question of questions) {
      const error = essayWordCountError(question, formData[question.id]);
      if (error) {
        setMessage(error);
        return false;
      }
    }
    return true;
  }

  async function sendVerificationCode() {
    if (!turnstileToken) throw new Error("Please complete the security verification first.");
    const response = await fetch("/api/auth/challenges/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: formData[emailFieldId], displayName: formData.fullName, purpose: "application", turnstileToken }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || result.error || "Unable to send verification code.");
    setChallengeId(result.challengeId);
    setVerificationCode("");
    setMessage("A verification code has been sent to your email. Enter it in the verification box below.");
  }

  async function completeSubmission() {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const delegationInviteToken = params?.get("invite");
    const delegationMagiclinkId = params?.get("magiclink");
    const response = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationType, formData, ...(delegationInviteToken ? { delegationInviteToken } : {}), ...(delegationMagiclinkId ? { delegationMagiclinkId } : {}) }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || result.error || "Unable to submit application.");
    if (typeof window !== "undefined") window.localStorage.removeItem(storageKey);
    router.push("/portal?submitted=1");
    router.refresh();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setMessage("");
    try {
      if (sessionStatus !== "authenticated") {
        if (!turnstileToken) throw new Error("Please complete the security verification first.");
        if (!challengeId) {
          await sendVerificationCode();
          return;
        }
        if (verificationCode.length !== 6) throw new Error("Enter the six-digit verification code.");
        const verifyResponse = await fetch("/api/auth/challenges/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challengeId, email: formData[emailFieldId], displayName: formData.fullName, purpose: "application", code: verificationCode }),
        });
        const verification = await verifyResponse.json();
        if (!verifyResponse.ok) throw new Error(verification.message || verification.error || "Invalid verification code.");
        const signInResult = await signIn("passwordless", { exchangeToken: verification.exchangeToken, redirect: false });
        if (signInResult?.error) throw new Error("Unable to start your session.");
      }
      await completeSubmission();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit application.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RavenPublicShell>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-8">
        <Link href="/apply" className="mb-8 inline-flex items-center text-sm text-white/70 hover:text-white"><ArrowLeft className="mr-2 h-4 w-4" /> All applications</Link>
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C4B5FD]">RavenMUN {new Date().getFullYear()}</p>
          <h1 className="raven-template-title mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{initialForm.title || titleFor(applicationType)}</h1>
          <p className="mt-3 text-white/75">Your information is saved on this device while you complete the application.</p>
        </div>

        <form onSubmit={submit} className="space-y-6">
          <section className="raven-public-card rounded-3xl p-6 sm:p-8">
            <div className="mb-7 flex items-center gap-3"><div className="rounded-xl bg-[#7C3AED]/15 p-2 text-[#C4B5FD]"><ShieldCheck className="h-5 w-5" /></div><div><h2 className="font-semibold">Your information</h2><p className="text-sm text-white/70">Your email is verified before the application is submitted.</p></div></div>
            <div className="grid gap-6 sm:grid-cols-2">
              {questions.map((question) => {
                const value = formData[question.id];
                const fullWidth = question.type === "textarea" || /^choice[123]$/.test(question.id);
                return <div key={question.id} className={fullWidth ? "sm:col-span-2" : ""}>
                  <Label htmlFor={question.id} className="mb-2 block text-[#C3C7D1]">{question.label}{question.required && <span className="ml-1 text-[#C4B5FD]">*</span>}</Label>
                  {question.type === "textarea" ? <><textarea id={question.id} required={question.required} value={String(value || "")} onChange={(event) => updateField(question.id, event.target.value)} placeholder={question.placeholder} className="min-h-32 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none ring-[#7C3AED] placeholder:text-[#6B7280] focus:ring-2" /><p className={`mt-1 text-right text-xs ${isEssayQuestion(question) && countWords(String(value || "")) < essayMinWords(question) ? "text-[#C4B5FD]" : "text-[#6B7280]"}`}>{isEssayQuestion(question) ? `${countWords(String(value || ""))} / ${essayMinWords(question)} words` : `${String(value || "").length} characters`}</p></>
                    : question.type === "select" ? <select id={question.id} required={question.required} value={String(value || "")} onChange={(event) => updateField(question.id, event.target.value)} className="h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#7C3AED]"><option value="">Select an option</option>{question.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                    : question.type === "checkbox" ? <label className="flex items-center gap-3 text-sm text-[#C3C7D1]"><input id={question.id} type="checkbox" checked={Boolean(value)} onChange={(event) => updateField(question.id, event.target.checked)} className="h-4 w-4 accent-[#7C3AED]" /> I confirm this information is accurate.</label>
                    : <Input id={question.id} type={question.type} required={question.required} value={String(value || "")} onChange={(event) => updateField(question.id, event.target.value)} placeholder={question.placeholder} disabled={question.id === emailFieldId && sessionStatus === "authenticated"} className="border-white/10 bg-black/20 text-white placeholder:text-[#6B7280]" />}
                </div>;
              })}
            </div>
          </section>

          {sessionStatus !== "authenticated" && <section className="raven-public-card rounded-3xl p-6 sm:p-8"><div className="mb-4"><h2 className="font-semibold">Security check</h2><p className="mt-1 text-sm text-white/70">Complete the verification before requesting an email code.</p></div>{TURNSTILE_SITE_KEY ? <Turnstile siteKey={TURNSTILE_SITE_KEY} onVerify={setTurnstileToken} onError={() => setTurnstileToken("")} onExpire={() => setTurnstileToken("")} /> : <p className="text-sm text-rose-300">Security verification is not configured.</p>}</section>}

          {challengeId && <section className="raven-public-card rounded-3xl border-[#7C3AED]/40 p-6 sm:p-8"><div className="mb-5 flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-[#C4B5FD]" /><div><h2 className="font-semibold">Verify your email</h2><p className="text-sm text-white/75">Enter the six-digit code sent to {String(formData[emailFieldId])}.</p></div></div>{message && <p role="status" className="mb-4 rounded-xl border border-[#C4B5FD]/20 bg-[#C4B5FD]/10 p-3 text-sm text-[#C4B5FD]">{message}</p>}<Label htmlFor="verification-code" className="mb-2 block text-sm text-[#C3C7D1]">Verification code</Label><Input id="verification-code" name="verificationCode" autoFocus inputMode="numeric" maxLength={6} value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" className="max-w-xs border-white/10 bg-black/20 text-center font-mono tracking-[0.4em] text-white" /><p className="mt-3 text-xs text-white/60">The code expires in 10 minutes.</p></section>}

          {message && !challengeId && <p role="status" className="rounded-xl border border-[#C4B5FD]/20 bg-[#C4B5FD]/10 p-4 text-sm text-[#C4B5FD]">{message}</p>}
          <div className="flex justify-end"><Button type="submit" disabled={submitting || (sessionStatus !== "authenticated" && !turnstileToken) || (Boolean(challengeId) && sessionStatus !== "authenticated" && verificationCode.length !== 6)} className="bg-[#7C3AED] px-6 text-white hover:bg-[#6D28D9]">{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{challengeId && sessionStatus !== "authenticated" ? "Verify and submit application" : sessionStatus === "authenticated" ? "Submit application" : "Send verification code"}</Button></div>
        </form>
      </div>
    </RavenPublicShell>
  );
}
