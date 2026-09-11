import { z } from "zod";

export const applicationFieldTypeSchema = z.enum([
  "text",
  "number",
  "tel",
  "email",
  "date",
  "select",
  "textarea",
  "url",
  "checkbox",
]);

export const applicationFieldSchema = z.object({
  id: z.string().trim().min(1).max(100).regex(/^[A-Za-z][A-Za-z0-9_-]*$/, "Field IDs may contain letters, numbers, underscores, and hyphens."),
  label: z.string().trim().min(1).max(300),
  type: applicationFieldTypeSchema,
  required: z.boolean().optional(),
  placeholder: z.string().max(500).optional(),
  options: z.array(z.object({
    value: z.string().trim().min(1).max(200),
    label: z.string().trim().min(1).max(200),
  })).max(50).optional(),
  system_map: z.string().trim().max(100).optional(),
  minWords: z.number().int().min(1).max(10000).optional(),
});

export const applicationQuestionsSchema = z.array(applicationFieldSchema).max(100).superRefine((fields, context) => {
  const ids = new Set<string>();
  fields.forEach((field, index) => {
    if (ids.has(field.id)) {
      context.addIssue({ code: "custom", path: [index, "id"], message: "Field IDs must be unique." });
    }
    ids.add(field.id);

    // Committee choices are replaced with live committee options at render
    // time, so their stored option list is intentionally empty.
    if (field.type === "select" && (!field.options || field.options.length === 0) && !/^choice[123]$/.test(field.id)) {
      context.addIssue({ code: "custom", path: [index, "options"], message: "Select fields need at least one option." });
    }
  });
});

export type ApplicationField = z.infer<typeof applicationFieldSchema>;
