import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { encode } from "next-auth/jwt";
import { HocuspocusProvider, HocuspocusProviderWebsocket } from "@hocuspocus/provider";
import WebSocket from "ws";
import * as Y from "yjs";
import { createClient } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/roles";

config({ path: ".env.local" });
config({ path: ".env" });

const databaseUrl = process.env.DATABASE_URL;
const secret = process.env.NEXTAUTH_SECRET;
if (!databaseUrl || !secret) throw new Error("DATABASE_URL and NEXTAUTH_SECRET are required.");

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" },
  }),
});
const baseUrl = process.env.LIVE_TEST_BASE_URL || "http://localhost:3102";
const startedAt = new Date();
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const testEmailDomain = "example.com";
const createdUserIds: string[] = [];
const testEmails: string[] = [];
let createdCommitteeId: string | null = null;
let createdPhotoAreaId: string | null = null;
let uploadedPhotoPath: string | null = null;
const liveWebsocketProviders: HocuspocusProviderWebsocket[] = [];

type Actor = { id: string; email: string; role: string; cookie: string; sessionId: string };

async function createActor(label: string, role: string, options: { accountRole?: string; assignment?: boolean; committeeId?: string | null } = {}): Promise<Actor> {
  const email = `ravenmun-e2e-${runId}-${label}@${testEmailDomain}`;
  const user = await prisma.users.create({ data: {
    email,
    full_name: `E2E ${label}`,
    role: options.accountRole ? "applicant" : role,
    account_role: options.accountRole || "member",
  } });
  createdUserIds.push(user.id);
  testEmails.push(email);
  await prisma.user_details.create({ data: { user_id: user.id, school: "Raven Test School", city: "Istanbul", grade: "11" } });
  if (options.assignment) {
    await prisma.conference_assignments.create({ data: {
      user_id: user.id,
      role,
      committee_id: options.committeeId || null,
    } });
  }
  const activeSession = await prisma.active_sessions.create({ data: {
    user_id: user.id,
    user_agent: "RavenMUN live workflow test",
    ip_address: "127.0.0.1",
    expires_at: new Date(Date.now() + 60 * 60 * 1000),
  } });
  const token = await encode({
    secret: secret!,
    maxAge: 60 * 60,
    token: {
      sub: user.id,
      id: user.id,
      name: user.full_name,
      email: user.email,
      role: role as UserRole,
      applicantType: role as UserRole,
      applicationStatus: "approved",
      committeeId: options.committeeId || null,
      sessionId: activeSession.id,
    },
  });
  return { id: user.id, email, role, sessionId: activeSession.id, cookie: `next-auth.session-token=${token}` };
}

async function request(actor: Actor | null, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (actor) headers.set("cookie", actor.cookie);
  if (typeof init.body === "string" && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${baseUrl}${path}`, { ...init, headers, redirect: "manual" });
}

async function expectStatus(actor: Actor | null, path: string, expected: number) {
  const response = await request(actor, path);
  assert.equal(response.status, expected, `${actor?.role || "public"} GET ${path}: expected ${expected}, got ${response.status} (${await response.text()})`);
  return response;
}

async function expectRedirect(actor: Actor, path: string, destination: string) {
  const response = await request(actor, path);
  assert.ok([302, 303, 307, 308].includes(response.status), `${actor.role} GET ${path}: expected redirect, got ${response.status}`);
  assert.equal(new URL(response.headers.get("location") || "", baseUrl).pathname, destination, `${actor.role} GET ${path}: wrong redirect`);
}

function answerForQuestion(question: Record<string, unknown>, email: string) {
  const id = String(question.id || "");
  const label = String(question.label || "");
  const type = String(question.type || "text");
  const hint = `${id} ${label}`.toLowerCase();
  if (type === "email") return email;
  if (type === "checkbox") return true;
  if (type === "date") return "2008-01-01";
  if (type === "number") return "1";
  if (type === "url") return "https://example.com";
  if (type === "select") return (question.options as Array<{ value?: unknown }> | undefined)?.find((option) => String(option.value || "").length)?.value || "other";
  if (hint.includes("full") && hint.includes("name")) return "Raven E2E Applicant";
  if (hint.includes("delegation") && hint.includes("name")) return `Raven E2E Delegation ${runId}`;
  if (hint.includes("school")) return "Raven Test School";
  if (hint.includes("grade") || hint.includes("year")) return "11";
  if (hint.includes("city")) return "Istanbul";
  if (hint.includes("phone")) return "+905551112233";
  return "RavenMUN automated workflow test response";
}

async function formDataFor(applicationType: string, email: string) {
  const form = await prisma.application_forms.findUnique({ where: { application_type: applicationType } });
  assert.ok(form?.is_active, `${applicationType} form must be active`);
  const questions = Array.isArray(form.questions) ? form.questions as Array<Record<string, unknown>> : [];
  assert.ok(questions.length > 0, `${applicationType} form must contain questions`);
  return Object.fromEntries(questions.map((question) => [String(question.id), answerForQuestion(question, email)]));
}

async function postJson(actor: Actor, path: string, body: unknown) {
  const response = await request(actor, path, { method: "POST", body: JSON.stringify(body) });
  const text = await response.text();
  // The live suite deliberately accepts both JSON error envelopes and plain-text errors.
  // API payloads are narrowed at the assertions that inspect their fields below.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any = null;
  try { payload = JSON.parse(text); } catch { payload = text; }
  return { response, payload };
}

async function run() {
  const staleUsers = await prisma.users.findMany({ where: { email: { startsWith: "ravenmun-e2e-" } }, select: { id: true } });
  if (staleUsers.length) await deleteTestUsers(staleUsers.map((user) => user.id));
  await prisma.committees.deleteMany({ where: { slug: { startsWith: "ravenmun-e2e-" } } });
  await prisma.photo_areas.deleteMany({ where: { name: { startsWith: "E2E Area " } } });

  const committee = await prisma.committees.create({ data: {
    name: `RavenMUN E2E Committee ${runId}`,
    slug: `ravenmun-e2e-${runId}`,
    description: "Disposable committee for automated role and collaboration tests.",
    is_published: false,
  } });
  createdCommitteeId = committee.id;

  const [applicant, delegate, chair, chairman, press, headPress, observer, headObserver, security, headSecurity, admin, delegationOwner, invitedMember] = await Promise.all([
    createActor("applicant", "applicant"),
    createActor("delegate", "delegate", { assignment: true, committeeId: committee.id }),
    createActor("chair", "chair", { assignment: true, committeeId: committee.id }),
    createActor("chairman", "committee_chairman", { assignment: true, committeeId: committee.id }),
    createActor("press", "press", { assignment: true }),
    createActor("head-press", "head_press", { assignment: true }),
    createActor("observer", "observer", { assignment: true }),
    createActor("head-observer", "head_observer", { assignment: true }),
    createActor("security", "security", { assignment: true }),
    createActor("head-security", "head_security", { assignment: true }),
    createActor("site-admin", "admin", { accountRole: "site_admin" }),
    createActor("delegation-owner", "applicant"),
    createActor("invited-member", "applicant"),
  ]);

  for (const actor of [applicant, delegate, chair, chairman, press, headPress, observer, headObserver, security, headSecurity, admin]) {
    await expectStatus(actor, "/portal", 200);
    await expectStatus(actor, "/api/participant/me", 200);
  }

  await expectStatus(admin, "/admin", 200);
  await expectStatus(admin, "/api/admin/raven/stats", 200);
  await expectRedirect(delegate, "/admin", "/portal");
  await expectStatus(delegate, "/dashboard/committee", 200);
  await expectStatus(chair, "/dashboard/committee", 200);
  await expectStatus(chairman, "/dashboard/committee", 200);
  await expectRedirect(press, "/dashboard/committee", "/portal");

  await expectStatus(press, "/organisation/press/upload", 200);
  await expectRedirect(headPress, "/organisation/press/gallery", "/gallery");
  await expectStatus(headPress, "/gallery", 200);
  await expectStatus(press, "/api/gallery/status", 200);
  await expectRedirect(observer, "/organisation/press/upload", "/portal");
  await expectStatus(observer, "/organisation/observers/my-tasks", 200);
  await expectStatus(observer, "/api/observer/info", 200);
  await expectStatus(headObserver, "/organisation/observers/tasks", 200);
  await expectStatus(headObserver, "/api/observer/list", 200);
  await expectStatus(security, "/organisation/security/scan", 200);
  await expectStatus(headSecurity, "/organisation/security/logs", 200);
  await expectStatus(headSecurity, "/api/security/logs", 200);
  await expectRedirect(security, "/organisation/observers/my-tasks", "/portal");

  const adminPages = [
    "/admin/applications", "/admin/users", "/admin/committees", "/admin/forms",
    "/admin/announcements", "/admin/content", "/admin/payments", "/admin/catering",
    "/admin/resources", "/admin/tickets", "/admin/roll-call", "/admin/documents",
    "/admin/logs", "/admin/settings", "/admin/delegations",
  ];
  for (const path of adminPages) await expectStatus(admin, path, 200);
  const adminApis = [
    "/api/applications?page=1&limit=10&status=all&sort_by=submitted_at&sort_order=desc",
    "/api/admin/users?page=1&limit=10&sort_by=created_at&sort_order=desc",
    "/api/admin/committees", "/api/forms", "/api/announcements",
    "/api/admin/content", "/api/admin/payments?status=all&page=1",
    "/api/admin/payments/stats", "/api/resources?page=1&limit=10",
    "/api/tickets?status=all&page=1", "/api/admin/roll-calls?page=1&limit=10",
    "/api/admin/logs?page=1&limit=10", "/api/admin/settings",
    "/api/admin/delegations?page=1&limit=10",
  ];
  for (const path of adminApis) await expectStatus(admin, path, 200);

  const assignmentResult = await postJson(admin, "/api/admin/committee-assignment", { userId: applicant.id, role: "delegate", committeeId: committee.id });
  assert.equal(assignmentResult.response.status, 200, `admin role assignment failed: ${JSON.stringify(assignmentResult.payload)}`);
  assert.equal((await prisma.conference_assignments.findUnique({ where: { user_id: applicant.id } }))?.role, "delegate");
  for (const is_suspended of [true, false]) {
    const response = await request(admin, "/api/admin/users", { method: "PUT", body: JSON.stringify({ id: applicant.id, is_suspended }) });
    assert.equal(response.status, 200, `admin suspension update failed: ${await response.text()}`);
    assert.equal((await prisma.users.findUnique({ where: { id: applicant.id } }))?.is_suspended, is_suspended);
  }

  const allocation = await postJson(headObserver, "/api/observer/assign", { user_id: observer.id, committee: committee.id });
  assert.ok([200, 201].includes(allocation.response.status), `observer allocation failed: ${JSON.stringify(allocation.payload)}`);
  const taskCreation = await postJson(headObserver, "/api/observer/create", { assigned_to: observer.id, assigned_task: "E2E logistics task", task_description: "Disposable workflow test" });
  assert.equal(taskCreation.response.status, 201, `observer task creation failed: ${JSON.stringify(taskCreation.payload)}`);
  const observerInfo = await request(observer, "/api/observer/info");
  const observerInfoPayload = await observerInfo.json() as { tasks?: Array<{ id: string; status: string }> };
  assert.equal(observerInfo.status, 200);
  assert.ok(observerInfoPayload.tasks?.some((task) => String(task.id) === String(taskCreation.payload.id)), "assigned observer cannot see the new task");
  const taskCompletion = await postJson(observer, "/api/observer/task", { target_task_id: String(taskCreation.payload.id), action: "complete" });
  assert.equal(taskCompletion.response.status, 200, `observer task completion failed: ${JSON.stringify(taskCompletion.payload)}`);
  assert.equal(taskCompletion.payload.status, "completed");

  const participantTokenResponse = await request(delegate, "/api/security/token");
  assert.equal(participantTokenResponse.status, 200);
  const participantToken = await participantTokenResponse.json() as { payload: string };
  const scan = await postJson(security, "/api/security/scan", { payload: participantToken.payload });
  assert.equal(scan.response.status, 200, `security scan failed: ${JSON.stringify(scan.payload)}`);
  assert.equal(scan.payload.result, "allowed");

  const photoArea = await prisma.photo_areas.create({ data: { name: `E2E Area ${runId}`, description: "Disposable upload test" } });
  createdPhotoAreaId = photoArea.id;
  const uploadBody = new FormData();
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9WlQAAAABJRU5ErkJggg==", "base64");
  uploadBody.set("file", new File([png], "ravenmun-e2e.png", { type: "image/png" }));
  uploadBody.set("area_id", photoArea.id);
  const uploadResponse = await request(press, "/api/gallery/upload", { method: "POST", body: uploadBody });
  const uploadPayload = await uploadResponse.json() as { data?: { id: string; storage_path: string }; error?: string };
  assert.equal(uploadResponse.status, 200, `press upload failed: ${JSON.stringify(uploadPayload)}`);
  assert.ok(uploadPayload.data?.id && uploadPayload.data.storage_path, "press upload did not return a stored photo");
  uploadedPhotoPath = uploadPayload.data.storage_path;
  const deletePhoto = await request(press, `/api/gallery?id=${encodeURIComponent(uploadPayload.data.id)}`, { method: "DELETE" });
  assert.equal(deletePhoto.status, 200, `press photo deletion failed: ${await deletePhoto.text()}`);
  uploadedPhotoPath = null;

  const tokenResponse = await request(chair, "/api/auth/collaboration-token");
  const tokenResponseText = await tokenResponse.text();
  assert.equal(tokenResponse.status, 200, `collaboration token failed: ${tokenResponseText}`);
  const { token: collaborationToken } = JSON.parse(tokenResponseText) as { token: string };
  const collaborationUrl = process.env.LIVE_TEST_COLLAB_URL || "ws://localhost:3001";
  const marker = `collaboration-${runId}`;
  const connectDocument = async (document: Y.Doc) => new Promise<HocuspocusProvider>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Collaboration server did not synchronize within 10 seconds.")), 10_000);
    const websocketProvider = new HocuspocusProviderWebsocket({ url: collaborationUrl, WebSocketPolyfill: WebSocket });
    liveWebsocketProviders.push(websocketProvider);
    const provider = new HocuspocusProvider({
      websocketProvider,
      name: `committee-${committee.id}`,
      document,
      token: collaborationToken,
      onSynced: () => { clearTimeout(timeout); resolve(provider); },
      onAuthenticationFailed: ({ reason }) => { clearTimeout(timeout); reject(new Error(`Collaboration authentication failed: ${reason}`)); },
    });
    provider.attach();
  });
  const firstDocument = new Y.Doc();
  const firstProvider = await connectDocument(firstDocument);
  firstDocument.getText("ravenmun-e2e").insert(0, marker);
  await new Promise((resolve) => setTimeout(resolve, 750));
  firstProvider.destroy();
  await new Promise((resolve) => setTimeout(resolve, 1_500));
  assert.ok((await prisma.committee_documents.findUnique({ where: { committee_id: committee.id } }))?.document_blob, "collaboration update was not persisted");
  const secondDocument = new Y.Doc();
  const secondProvider = await connectDocument(secondDocument);
  assert.equal(secondDocument.getText("ravenmun-e2e").toString(), marker, "collaboration document did not reload its persisted state");
  secondProvider.destroy();

  if (process.env.LIVE_TEST_SKIP_INVITES !== "true") {
  const ownerSubmission = await postJson(delegationOwner, "/api/applications", {
    applicationType: "delegation",
    formData: await formDataFor("delegation", delegationOwner.email),
  });
  assert.equal(ownerSubmission.response.status, 200, `delegation application failed: ${JSON.stringify(ownerSubmission.payload)}`);
  const delegation = await prisma.delegations.findUnique({ where: { owner_id: delegationOwner.id } });
  assert.ok(delegation, "delegation application did not create a delegation");

  const deliveryEmail = process.env.LIVE_TEST_DELIVERY_EMAIL;
  if (deliveryEmail) {
    testEmails.push(deliveryEmail.toLowerCase());
    const sent = await postJson(delegationOwner, "/api/delegations/invites", { email: deliveryEmail, turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" });
    assert.equal(sent.response.status, 200, `delivery invitation failed: ${JSON.stringify(sent.payload)}`);
    assert.equal(sent.payload.emailSent, true, "Resend did not deliver the delegation invitation");
    const resent = await postJson(delegationOwner, "/api/delegations/invites", { inviteId: sent.payload.invite.id, turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" });
    assert.equal(resent.response.status, 200, `invitation resend failed: ${JSON.stringify(resent.payload)}`);
    assert.equal(resent.payload.emailSent, true, "Resend did not re-deliver the delegation invitation");
  }

  const inviteResult = await postJson(delegationOwner, "/api/delegations/invites", { email: invitedMember.email, turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" });
  assert.equal(inviteResult.response.status, 200, `member invitation failed: ${JSON.stringify(inviteResult.payload)}`);
  const outbox = await prisma.email_outbox.findFirst({ where: { recipient_email: invitedMember.email }, orderBy: { created_at: "desc" } });
  assert.ok(outbox, "invitation did not create a durable email job");
  const tokenMatch = outbox.html.match(/[?&]token=([^&"<]+)/);
  assert.ok(tokenMatch, "invitation email did not contain an invitation token");
  const invitationToken = decodeURIComponent(tokenMatch[1].replace(/&amp;$/, ""));
  await expectStatus(null, `/api/delegations/invites/${encodeURIComponent(invitationToken)}`, 200);

  const delegateSubmission = await postJson(invitedMember, "/api/applications", {
    applicationType: "delegate",
    delegationInviteToken: invitationToken,
    formData: await formDataFor("delegate", invitedMember.email),
  });
  assert.equal(delegateSubmission.response.status, 200, `invited delegate application failed: ${JSON.stringify(delegateSubmission.payload)}`);
  const membership = await prisma.delegation_members.findUnique({ where: { delegation_id_user_id: { delegation_id: delegation.id, user_id: invitedMember.id } } });
  assert.equal(membership?.accepted, true, "invited applicant was not added to the delegation");

  const gradeBefore = (await prisma.user_details.findUnique({ where: { user_id: invitedMember.id } }))?.grade;
  const chairSubmission = await postJson(invitedMember, "/api/applications", {
    applicationType: "chairboard",
    formData: await formDataFor("chairboard", invitedMember.email),
  });
  assert.equal(chairSubmission.response.status, 200, `second application failed: ${JSON.stringify(chairSubmission.payload)}`);
  assert.equal(await prisma.applications.count({ where: { user_id: invitedMember.id } }), 2, "multiple application types were not retained");
  assert.equal((await prisma.user_details.findUnique({ where: { user_id: invitedMember.id } }))?.grade, gradeBefore, "a later application erased the saved grade");

  const ownerPortal = await request(delegationOwner, "/api/delegations/invites");
  const ownerPortalPayload = await ownerPortal.json() as { canManage?: boolean; members?: unknown[] };
  assert.equal(ownerPortal.status, 200);
  assert.equal(ownerPortalPayload.canManage, true);
  assert.ok((ownerPortalPayload.members || []).length >= 1, "delegation owner cannot see accepted members");
  const memberPortal = await request(invitedMember, "/api/delegations/invites");
  const memberPortalPayload = await memberPortal.json() as { canManage?: boolean };
  assert.equal(memberPortal.status, 200);
  assert.equal(memberPortalPayload.canManage, false);
  }

  console.log("Live roles, collaboration, multi-application, delegation invitation, and membership workflows passed.");
}

async function cleanup() {
  for (const websocketProvider of liveWebsocketProviders) websocketProvider.destroy();
  if (uploadedPhotoPath) {
    const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const storageKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_SERVICE_ROLE_KEY;
    if (storageUrl && storageKey) await createClient(storageUrl, storageKey).storage.from("press-photos").remove([uploadedPhotoPath]);
  }
  if (createdPhotoAreaId) {
    await prisma.press_photos.deleteMany({ where: { area_id: createdPhotoAreaId } });
    await prisma.photo_areas.deleteMany({ where: { id: createdPhotoAreaId } });
  }
  await prisma.email_outbox.deleteMany({ where: { recipient_email: { in: testEmails }, created_at: { gte: startedAt } } });
  if (createdUserIds.length) await deleteTestUsers(createdUserIds);
  if (createdCommitteeId) await prisma.committees.deleteMany({ where: { id: createdCommitteeId } });
}

async function deleteTestUsers(userIds: string[]) {
  await prisma.observer_tasks.deleteMany({ where: { OR: [{ assigned_by: { in: userIds } }, { assigned_to: { in: userIds } }] } });
  await prisma.observer_allocations.deleteMany({ where: { id: { in: userIds } } });
  await prisma.security_entry_logs.deleteMany({ where: { OR: [{ scanned_by: { in: userIds } }, { scanned_user_id: { in: userIds } }] } });
  await prisma.committee_members.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.conference_assignments.deleteMany({ where: { OR: [{ user_id: { in: userIds } }, { assigned_by: { in: userIds } }] } });
  await prisma.audit_logs.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.logs.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.users.deleteMany({ where: { id: { in: userIds } } });
}

(async () => {
  let failure: unknown;
  try { await run(); } catch (error) { failure = error; }
  try { await cleanup(); } catch (cleanupError) {
    if (!failure) failure = cleanupError;
    else console.error("Live-test cleanup also failed:", cleanupError);
  }
  await prisma.$disconnect();
  if (failure) throw failure;
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
