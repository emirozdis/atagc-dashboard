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

// Schema used during the final POST submission to handle existing/resumed accounts
export const submissionAccountSchema = z.object({
  adSoyad: z.string().optional(),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  password: z.string().min(1, "Şifre zorunludur"),
  confirmPassword: z.string().optional(),
});

export type AccountCreationData = z.infer<typeof accountCreationSchema>;

// --- Personal Details Schema ---
export const personalDetailsSchema = z.object({
  phone_number: z.string().min(10, "Geçerli bir telefon numarası giriniz"),
  birth_date: z.string().min(1, "Doğum tarihi zorunludur"),
  city: z.string().min(1, "Şehir seçimi zorunludur"),
  grade: z.enum(['prep', '9', '10', '11', '12', 'university']),
  high_school_id: z.number().min(-1, "Okul seçimi zorunludur"),
  manual_school_name: z.string().optional(),
  delegation_name: z.string().optional(), 
  kvkk_consent: z.boolean().refine(val => val === true, {
    message: "Devam etmek için KVKK Aydınlatma Metni'ni onaylamanız gerekmektedir."
  }),
}).refine((data) => {
  if (data.high_school_id === -1) {
    return !!data.manual_school_name && data.manual_school_name.length > 3;
  }
  return true;
}, {
  message: "Lütfen okul adınızı en az 4 karakter olacak şekilde yazınız",
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
}

export type DynamicFormData = Record<string, any>;

export interface FullApplicationSubmission {
  account: z.infer<typeof submissionAccountSchema>;
  personalDetails: PersonalDetailsData;
  formId: string;
  formData: DynamicFormData;
}