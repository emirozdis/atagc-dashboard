import { z } from "zod";

// Matching PostgreSQL ENUM: application_status_enum
export enum ApplicationStatusEnum {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

// --- Static Schemas (Account Creation) ---
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const accountCreationSchema = z.object({
  adSoyad: z.string().min(2, "Ad soyad en az 2 karakter olmalıdır").max(100, "Ad soyad en fazla 100 karakter olabilir"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  password: z.string()
    .min(8, "Şifre en az 8 karakter olmalıdır")
    .regex(passwordRegex, "Şifre en az 1 büyük harf, 1 küçük harf ve 1 rakam içermelidir"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Şifreler eşleşmiyor",
  path: ["confirmPassword"],
});

export type AccountCreationData = z.infer<typeof accountCreationSchema>;

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
}

export type DynamicFormData = Record<string, any>;

export interface FullApplicationSubmission {
  account: AccountCreationData;
  formId: string;
  formData: DynamicFormData;
  kvkkApproved: boolean;
}

// Change Log:
// - Added `ApplicationStatusEnum`.