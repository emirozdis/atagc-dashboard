import { z } from "zod";

export const personalInfoSchema = z.object({
  adSoyad: z.string().min(2, "Ad soyad en az 2 karakter olmalıdır").max(100, "Ad soyad en fazla 100 karakter olabilir"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  telefon: z.string().min(10, "Geçerli bir telefon numarası giriniz").max(15, "Telefon numarası çok uzun"),
  dogumTarihi: z.string().min(1, "Doğum tarihi zorunludur"),
  okul: z.string().min(2, "Okul adı en az 2 karakter olmalıdır").max(150, "Okul adı çok uzun"),
  sinif: z.string().min(1, "Sınıf seçimi zorunludur"),
  sehir: z.string().min(2, "Şehir en az 2 karakter olmalıdır").max(50, "Şehir adı çok uzun"),
});

export const experienceSchema = z.object({
  munDeneyimi: z.string().min(1, "Bu alan zorunludur"),
  oncekiKonferanslar: z.string().max(500, "En fazla 500 karakter").optional(),
  komiteTercihi1: z.string().min(1, "Birinci tercih zorunludur"),
  komiteTercihi2: z.string().optional(),
  delegasyonTercihi: z.string().min(1, "Delegasyon tercihi zorunludur"),
  ingilizce: z.string().min(1, "İngilizce seviyesi zorunludur"),
});

export const motivationSchema = z.object({
  katilimNedeni: z.string().min(50, "En az 50 karakter yazınız").max(1000, "En fazla 1000 karakter"),
  beklentiler: z.string().min(50, "En az 50 karakter yazınız").max(1000, "En fazla 1000 karakter"),
  kendinizTanitin: z.string().min(100, "En az 100 karakter yazınız").max(1500, "En fazla 1500 karakter"),
  kvkkOnay: z.boolean().refine((val) => val === true, "KVKK onayı zorunludur"),
});

export type PersonalInfoData = z.infer<typeof personalInfoSchema>;
export type ExperienceData = z.infer<typeof experienceSchema>;
export type MotivationData = z.infer<typeof motivationSchema>;

export interface ApplicationFormData {
  personalInfo: PersonalInfoData;
  experience: ExperienceData;
  motivation: MotivationData;
}

export const SINIF_OPTIONS = [
  { value: "9", label: "9. Sınıf" },
  { value: "10", label: "10. Sınıf" },
  { value: "11", label: "11. Sınıf" },
  { value: "12", label: "12. Sınıf" },
  { value: "mezun", label: "Mezun" },
];

export const MUN_DENEYIMI_OPTIONS = [
  { value: "yok", label: "Deneyimim yok" },
  { value: "1-2", label: "1-2 konferans" },
  { value: "3-5", label: "3-5 konferans" },
  { value: "5+", label: "5'ten fazla konferans" },
];

export const KOMITE_OPTIONS = [
  { value: "genel-kurul", label: "Birleşmiş Milletler Genel Kurulu" },
  { value: "guvenlik", label: "Güvenlik Konseyi" },
  { value: "ekonomik-sosyal", label: "Ekonomik ve Sosyal Konsey" },
  { value: "insan-haklari", label: "İnsan Hakları Konseyi" },
  { value: "tarihi", label: "Tarihî Komite" },
];

export const INGILIZCE_OPTIONS = [
  { value: "baslangic", label: "Başlangıç (A1-A2)" },
  { value: "orta", label: "Orta (B1-B2)" },
  { value: "ileri", label: "İleri (C1-C2)" },
  { value: "anadil", label: "Anadil" },
];