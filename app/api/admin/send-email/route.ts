import { NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import getAuthorization from "@/lib/getAuthorization";
import { isRavenmunEmailAddress, sendPlainTextEmail } from "@/lib/email";
import { Logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { ROLES } from "@/lib/roles";

const sendLimit = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500 });
const emailAddressSchema = z.string().trim().email().max(320);
const sendEmailSchema = z.object({
  from: emailAddressSchema.refine(isRavenmunEmailAddress, "The sender must use a ravenmun.com address."),
  to: emailAddressSchema,
  subject: z.string().trim().min(1).max(180).refine((value) => !/[\r\n]/.test(value), "Subject cannot contain line breaks."),
  text: z.string().min(1).max(100_000).refine((value) => value.trim().length > 0, "Message cannot be empty."),
});

export const POST = apiHandler(async (request: Request) => {
  const auth = await getAuthorization({ requireAuth: true, allowedRoles: [ROLES.ADMIN, ROLES.SUPERADMIN] });
  if (!auth.ok || !auth.session) throw new Error("Unauthorized");

  await sendLimit.check(20, auth.session.user.id);
  const input = sendEmailSchema.parse(await request.json());
  await sendPlainTextEmail(input.to, input.from, input.subject, input.text);

  await Logger.audit(
    { userId: auth.session.user.id, req: request },
    {
      action: "send_plaintext_email",
      category: "system",
      resourceType: "email",
      metadata: {
        from: input.from.toLowerCase(),
        to: input.to.toLowerCase(),
        subject: input.subject,
        body_length: input.text.length,
      },
    },
  );

  return NextResponse.json({ success: true });
});
