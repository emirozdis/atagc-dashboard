import { z } from "zod";

// Matching PostgreSQL ENUM: application_status_enum
export enum ApplicationStatusEnum {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  ACCEPTED = 'accepted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn'
}

export type ApplicationStatus = 'pending' | 'under_review' | 'accepted' | 'approved' | 'rejected' | 'withdrawn';

// --- Static Schemas (Account Creation) ---
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const accountCreationSchema = z.object({
  adSoyad: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be no more than 100 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(passwordRegex, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Schema used during the final POST submission to handle existing/resumed accounts
export const submissionAccountSchema = z.object({
  adSoyad: z.string().optional(),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  confirmPassword: z.string().optional(),
});

export type AccountCreationData = z.infer<typeof accountCreationSchema>;

// --- Personal Details Schema ---
export const personalDetailsSchema = z.object({
  phone_number: z.string().min(10, "Enter a valid phone number"),
  birth_date: z.string().min(1, "Date of birth is required"),
  city: z.string().min(1, "Select a city"),
  grade: z.enum(['prep', '9', '10', '11', '12', 'university']),
  high_school_id: z.number().min(-1, "Select a school"),
  manual_school_name: z.string().optional(),
  delegation_name: z.string().optional(), 
  kvkk_consent: z.boolean().refine(val => val === true, {
    message: "You must agree to the privacy notice to continue."
  }),
}).refine((data) => {
  if (data.high_school_id === -1) {
    return !!data.manual_school_name && data.manual_school_name.length > 3;
  }
  return true;
}, {
  message: "Enter your school name using at least 4 characters",
  path: ["manual_school_name"]
});

export type PersonalDetailsData = z.infer<typeof personalDetailsSchema>;

// --- Dynamic Form Types ---

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormField {
  id: string;
  label: string;
  type: "text" | "number" | "tel" | "email" | "date" | "select" | "textarea" | "url" | "checkbox";
  required?: boolean;
  placeholder?: string;
  options?: FormFieldOption[];
  system_map?: string;
}

export interface FormStep {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

export interface ApplicationFormTemplate {
  id: string;
  slug: string;
  title: string;
  description: string;
  fee: number;
  steps: FormStep[];
  questions?: FormField[];
}

export type DynamicFormData = Record<string, unknown>;

export interface FullApplicationSubmission {
  account: z.infer<typeof submissionAccountSchema>;
  personalDetails: PersonalDetailsData;
  formId: string;
  formData: DynamicFormData;
}
