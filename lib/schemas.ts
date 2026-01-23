import { z } from "zod";
import { ApplicationStatusEnum } from "@/types/application";

// Admin
export const committeeAssignmentSchema = z.object({
  userId: z.uuid(),
  committeeId: z.uuid().nullable(),
});

export const committeeSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().min(2, "Komite adı en az 2 karakter olmalıdır."),
  description: z.string().optional(),
  topicTitle: z.string().optional(),
  topicDescription: z.string().optional(),
});

export const warningSchema = z.object({
  userId: z.uuid(),
  reason: z.string().min(3, "Sebep en az 3 karakter olmalıdır."),
});

// Auth
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  token: z.string(),
});

export const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  token: z.string(),
});

// Resources
export const resourceUploadSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  category: z.enum(["general", "guide", "rules", "award", "schedule"]),
  is_public: z.preprocess((val) => val === 'true' || val === true, z.boolean()),
  committee_id: z.string().optional().nullable(),
});

// User Profile
export const updateProfileSchema = z.object({
  full_name: z.string().min(2).optional(),
  phone_number: z.string().optional(),
  school_name: z.string().optional(),
  birth_date: z.string().optional(),
  city: z.string().optional(),
  profile_picture_url: z.string().nullable().optional(),
  is_profile_picture_hidden: z.boolean().optional(),
  allow_connections: z.boolean().optional(),
  notification_preferences: z.record(z.string(), z.boolean()).optional()
});

// Applications
export const searchParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional().default(""),
  status: z.string().optional().default("all"),
  sort_by: z.enum(["submitted_at", "status", "full_name"]).default("submitted_at"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
});

export const updateApplicationSchema = z.object({
  id: z.uuid(),
  status: z.enum(ApplicationStatusEnum),
  review_notes: z.string().optional(),
});