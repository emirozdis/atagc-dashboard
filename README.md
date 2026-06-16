# ATAGÇ 2026 - Etkinlik Yönetim Paneli

## Proje Hakkında
ATAGÇ 2026 Etkinlik Yönetim Paneli, Atatürk Gençliği Çalıştayı 2026 etkinliğinin tüm operasyonel süreçlerini yönetmek ve katılımcılarla etkileşim kurmak için tasarlanmış kapsamlı bir web uygulamasıdır. Başvuru süreçlerinden ödeme takibine, komite içi iş birliğinden duyuru yönetimine kadar geniş bir yelpazede hizmet sunar.

## Temel Özellikler
- **Rol Tabanlı Erişim Kontrolü (RBAC):** Yönetici, Komite Başkanı, Delege, Gözlemci, Basın ve Güvenlik gibi farklı kullanıcı rolleri için özelleştirilmiş erişim yetkileri.
- **Dinamik Başvuru Formları:** Çok adımlı, özelleştirilebilir başvuru formları ve başvuru değerlendirme iş akışları.
- **Güvenli Kimlik Doğrulama:** NextAuth.js ve Supabase Auth ile güçlü kullanıcı kimlik doğrulama, oturum yönetimi ve isteğe bağlı iki faktörlü kimlik doğrulama (2FA) desteği.
- **Ödeme Yönetimi:** Katılım ücreti ödemelerinin takibi, dekont yükleme ve yönetici onay süreçleri.
- **Komite Yönetimi:** Komite üyelerinin listelenmesi, yoklama alma, gündem takibi ve gerçek zamanlı ortak belge düzenleme.
- **Duyuru Sistemi:** Genel, komiteye özel veya kişiye özel duyurular yayınlama ve yönetme imkanı.
- **Kaynak Kütüphanesi:** Dokümanlar, kılavuzlar ve diğer materyallerin rol bazlı erişimle paylaşımı.
- **Dijital Kimlik Kartı:** Etkinlik girişleri, yoklamalar ve sosyal bağlantılar için QR kod içeren dijital kimlik kartları.
- **Sosyal Bağlantılar:** Katılımcıların QR kod tarayarak birbirleriyle bağlantı kurmasını sağlayan sosyal ağ özelliği.
- **Destek Talep Sistemi:** Kullanıcıların anonim veya kimlik doğrulanmış olarak destek talepleri oluşturabilmesi ve takip edebilmesi.
- **Kullanıcı Yönetimi:** Yöneticiler için kullanıcı rollerini düzenleme, hesapları askıya alma ve uyarılar ekleme yeteneği.
- **Sistem Ayarları:** Başvuru alımını açma/kapama, bakım modu, fotoğraf galerisi erişimi gibi genel sistem ayarlarını yönetme.
- **Delegasyon Yönetimi:** Delegasyon liderlerinin kendi ekiplerini davet etme ve yönetme araçları.
- **Fotoğraf Galerisi:** Basın ekibi üyeleri için fotoğraf yükleme ve tüm katılımcılar için görüntüleme imkanı.
- **Ortak Belge Düzenleyici:** Gerçek zamanlı iş birliğine dayalı belge düzenleme aracı (Yjs ve Hocuspocus destekli).

## Teknik Yığın
- **Frontend:** Next.js, React, TypeScript, Tailwind CSS, Shadcn UI, React Query, Framer Motion, Sonner, next-themes, QRCode.react
- **Backend:** Next.js API Routes, Supabase (PostgreSQL, Auth, Storage, Realtime), NextAuth.js, Zod, bcryptjs, Nodemailer, UAParser, Hocuspocus (WebSocket Server)
- **Veritabanı:** Supabase (PostgreSQL)
- **Kimlik Doğrulama:** NextAuth.js, Supabase Auth, bcryptjs, Cloudflare Turnstile, TOTP
- **Dağıtım:** Vercel (Next.js için), Node.js (Hocuspocus sunucusu için), Docker (Hocuspocus sunucusu için potansiyel)

## Mimari Genel Bakış
Proje, Next.js'in güçlü özelliklerini kullanarak modern bir tam yığın uygulama olarak geliştirilmiştir. API rotaları, Supabase veritabanı, kimlik doğrulama ve depolama hizmetleriyle entegre olarak çalışır. Gerçek zamanlı özellikler için Supabase Realtime kullanılırken, ortak belge düzenleme deneyimi için özel bir Hocuspocus WebSocket sunucusu ve Yjs kütüphanesi entegre edilmiştir. Bu mimari, yüksek performans, ölçeklenebilirlik ve güvenli bir kullanıcı deneyimi sağlar.

## Kurulum ve Çalıştırma

1.  **Depoyu Klonlayın:**
    ```bash
    git clone https://github.com/emirozdis/atagc-dashboard.git
    cd atagc-dashboard
    ```

2.  **Bağımlılıkları Yükleyin:**
    ```bash
    npm install
    # veya
    yarn install
    ```

3.  **Ortam Değişkenlerini Yapılandırın:**
    `.env.local` dosyasını oluşturun ve aşağıdaki değişkenleri Supabase ve NextAuth.js bilgilerinizle doldurun:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    SUPABASE_SECRET_SERVICE_ROLE_KEY=your_supabase_service_role_key
    NEXTAUTH_SECRET=your_nextauth_secret
    NEXTAUTH_URL=http://localhost:3000
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_cloudflare_turnstile_site_key
    TURNSTILE_SECRET_KEY=your_cloudflare_turnstile_secret_key
    SMTP_HOST=your_smtp_host
    SMTP_PORT=your_smtp_port
    SMTP_USER=your_smtp_user
    SMTP_PASS=your_smtp_pass
    SMTP_FROM=no-reply@example.com
    NEXT_PUBLIC_COLLAB_PORT=3001 # Hocuspocus server port
    ```

4.  **Supabase Veritabanını Kurun:**
    Supabase projenizde gerekli tabloları ve RLS politikalarını oluşturun. `schema.sql` (varsa) dosyasını kullanabilirsiniz.

5.  **Hocuspocus Sunucusunu Başlatın:**
    `collab-server` dizinine gidin ve sunucuyu başlatın:
    ```bash
    cd collab-server
    npm install
    npm start
    ```

6.  **Next.js Uygulamasını Başlatın:**
    Proje kök dizinine geri dönün ve uygulamayı geliştirme modunda başlatın:
    ```bash
    npm run dev
    # veya
    yarn dev
    ```

    Uygulama `http://localhost:3000` adresinde çalışacaktır.

## Katkıda Bulunma
Katkılarınız memnuniyetle karşılanır! Lütfen bir özellik dalı oluşturmadan önce sorunları veya özellik isteklerini tartışmak için bir 'issue' açın.

## Lisans
Bu proje MIT Lisansı altında lisanslanmıştır. Daha fazla bilgi için `LICENSE` dosyasına bakın.