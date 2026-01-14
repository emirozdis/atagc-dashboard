export type NotificationType = 
  | "application_received"
  | "application_status"
  | "committee_assignment"
  | "connection_request"
  | "connection_accepted"
  | "warning_issued"
  | "account_suspended"
  | "password_changed";

interface EmailContent {
  subject: string;
  heading: string;
  message: string;
  buttonText?: string;
  buttonPath?: string; // Relative path for specific redirection
  accentColor?: string;
}

// --- Theme Constants ---
const COLORS = {
  background: "#f8f9fa", // Light Gray background
  container: "#ffffff",
  textPrimary: "#1f2937", // Gray-800
  textSecondary: "#6b7280", // Gray-500
  border: "#e5e7eb", // Gray-200
  primary: "#000000", // Black
  accent: "#d4af37", // Gold
  danger: "#dc2626", // Red-600
  success: "#059669", // Emerald-600
};

// --- Style Helpers ---
const getBaseStyles = () => `
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: ${COLORS.textPrimary};
  background-color: ${COLORS.background};
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
`;

const getWrapperStyles = () => `
  width: 100%;
  background-color: ${COLORS.background};
  padding: 40px 0;
`;

const getContainerStyles = () => `
  max-width: 600px;
  margin: 0 auto;
  background-color: ${COLORS.container};
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025);
  border: 1px solid ${COLORS.border};
`;

const getHeaderStyles = () => `
  background-color: ${COLORS.primary};
  padding: 40px;
  text-align: center;
`;

const getContentStyles = () => `
  padding: 40px 40px;
  text-align: left;
`;

const getHeadingStyles = (color: string = COLORS.textPrimary) => `
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 22px;
  font-weight: 700;
  color: ${color};
  line-height: 1.3;
`;

const getParagraphStyles = () => `
  margin-bottom: 24px;
  font-size: 15px;
  color: ${COLORS.textSecondary};
  line-height: 26px;
`;

const getButtonContainerStyles = () => `
  text-align: center;
  margin-top: 32px;
  margin-bottom: 16px;
`;

const getButtonStyles = (color: string = COLORS.primary) => `
  display: inline-block;
  background-color: ${color};
  color: #ffffff;
  text-decoration: none;
  padding: 14px 32px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const getFooterStyles = () => `
  background-color: #fafafa;
  padding: 32px 40px;
  text-align: center;
  border-top: 1px solid ${COLORS.border};
`;

const getFooterTextStyles = () => `
  margin: 0;
  font-size: 12px;
  color: ${COLORS.textSecondary};
  line-height: 18px;
`;

const getLinkStyles = () => `
  color: ${COLORS.primary};
  text-decoration: underline;
  font-weight: 500;
`;

// --- Content Logic ---
const getContent = (type: NotificationType, userName: string): EmailContent => {
  switch (type) {
    case "application_received":
      return {
        subject: "Başvurunuz Alındı | ATAGÇ 2026",
        heading: "Başvurunuz Bize Ulaştı",
        message: `Sayın <strong>${userName}</strong>,<br/><br/>ATAGÇ 2026'ya gösterdiğiniz ilgi için teşekkür ederiz. Başvuru formunuz sistemimize başarıyla kaydedilmiştir.<br/><br/>Başvurunuz ekibimiz tarafından titizlikle incelenecek ve en kısa sürede sonuçlandırılacaktır. Süreci panel üzerinden takip edebilirsiniz.`,
        buttonText: "Başvurumu Görüntüle",
        buttonPath: "/dashboard/my-application"
      };
    case "application_status":
      return {
        subject: "Başvuru Sonucu Açıklandı | ATAGÇ 2026",
        heading: "Başvuru Durumunuz Güncellendi",
        message: `Sayın <strong>${userName}</strong>,<br/><br/>Başvurunuzun değerlendirme süreci tamamlanmıştır. Sonucu ve detayları görüntülemek için lütfen panele giriş yapınız.`,
        buttonText: "Sonucu Öğren",
        buttonPath: "/dashboard",
        accentColor: COLORS.primary
      };
    case "committee_assignment":
      return {
        subject: "Komite Atamanız Gerçekleşti | ATAGÇ 2026",
        heading: "Komite Yerleştirmeniz Yapıldı",
        message: `Sayın <strong>${userName}</strong>,<br/><br/>ATAGÇ 2026 kapsamında görev alacağınız komite belirlenmiştir. Komite detaylarınıza, çalışma arkadaşlarınıza ve gündem maddelerine (Topic) panel üzerinden erişebilirsiniz.`,
        buttonText: "Komiteye Git",
        buttonPath: "/dashboard/committee",
        accentColor: COLORS.success
      };
    case "connection_request":
      return {
        subject: "Yeni Bağlantı İsteği | ATAGÇ",
        heading: "Biri Sizinle Tanışmak İstiyor",
        message: `Sayın <strong>${userName}</strong>,<br/><br/>Bir katılımcı size bağlantı isteği gönderdi. Bu isteği kabul ederek ağınızı genişletebilir ve etkinlik boyunca iletişimde kalabilirsiniz.`,
        buttonText: "İstekleri Yönet",
        buttonPath: "/dashboard/connections"
      };
    case "connection_accepted":
      return {
        subject: "Bağlantı İsteğiniz Kabul Edildi | ATAGÇ",
        heading: "Ağınız Genişliyor",
        message: `Sayın <strong>${userName}</strong>,<br/><br/>Gönderdiğiniz bağlantı isteği kabul edildi. Artık yeni bağlantınızla iletişim kurabilir ve profillerinizi görüntüleyebilirsiniz.`,
        buttonText: "Bağlantılarıma Git",
        buttonPath: "/dashboard/connections"
      };
    case "warning_issued":
      return {
        subject: "⚠️ Disiplin Bildirimi | ATAGÇ",
        heading: "Hesabınıza Uyarı Tanımlandı",
        message: `Sayın <strong>${userName}</strong>,<br/><br/>Yöneticiler tarafından hesabınıza bir disiplin uyarısı tanımlanmıştır. Etkinlik kurallarına riayet etmeniz, organizasyonun düzeni açısından büyük önem taşımaktadır.<br/><br/>Lütfen uyarı detaylarını panel üzerinden inceleyiniz.`,
        buttonText: "Panele Git",
        buttonPath: "/dashboard",
        accentColor: COLORS.danger
      };
    case "account_suspended":
      return {
        subject: "⛔ Hesabınız Askıya Alındı | ATAGÇ",
        heading: "Erişiminiz Kısıtlandı",
        message: `Sayın <strong>${userName}</strong>,<br/><br/>Hesabınızın sisteme erişimi, yöneticiler tarafından geçici veya kalıcı olarak durdurulmuştur.<br/><br/>Bu işlemin bir hata olduğunu düşünüyorsanız lütfen yönetim ekibiyle iletişime geçiniz.`,
        buttonText: "Giriş Ekranı",
        buttonPath: "/login",
        accentColor: COLORS.danger
      };
    case "password_changed":
      return {
        subject: "Güvenlik Uyarısı: Şifre Değişikliği",
        heading: "Şifreniz Değiştirildi",
        message: `Sayın <strong>${userName}</strong>,<br/><br/>Hesabınızın şifresi yakın zamanda başarıyla değiştirildi. Bu işlem sizin tarafınızdan yapılmadıysa, hesabınızın güvenliği için derhal bizimle iletişime geçmenizi öneririz.`,
        buttonText: "Hesabıma Git",
        buttonPath: "/dashboard/profile"
      };
    default:
      return {
        subject: "Yeni Bildirim | ATAGÇ",
        heading: "Yeni Bildiriminiz Var",
        message: `Sayın <strong>${userName}</strong>,<br/><br/>Panelinizde yeni bir bildirim var.`,
        buttonText: "Panele Git",
        buttonPath: "/dashboard"
      };
  }
};

export const generateEmailHtml = (type: NotificationType, userName: string, baseUrl: string) => {
  const content = getContent(type, userName);
  const headingColor = content.accentColor || COLORS.textPrimary;
  const buttonColor = content.accentColor || COLORS.primary;
  
  // Ensure we don't have double slashes if baseUrl has trailing slash
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const targetUrl = `${cleanBaseUrl}${content.buttonPath || '/dashboard'}`;

  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${content.subject}</title>
    </head>
    <body style="${getBaseStyles()}">
      <div style="${getWrapperStyles()}">
        <div style="${getContainerStyles()}">
          
          <!-- Header -->
          <div style="${getHeaderStyles()}">
             <img src="https://atagc.com.tr/logo.png" alt="ATAGÇ Logo" width="80" height="auto" style="display: block; margin: 0 auto; width: 80px;" />
             <div style="font-size: 14px; color: #ffffff; margin-top: 15px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; opacity: 0.9;">Atatürk Gençliği Çalıştayı</div>
          </div>

          <!-- Content -->
          <div style="${getContentStyles()}">
            <h2 style="${getHeadingStyles(headingColor)}">${content.heading}</h2>
            <div style="${getParagraphStyles()}">${content.message}</div>
            
            ${content.buttonText ? `
              <div style="${getButtonContainerStyles()}">
                <a href="${targetUrl}" target="_blank" style="${getButtonStyles(buttonColor)}">${content.buttonText}</a>
              </div>
            ` : ''}

            <div style="margin-top: 40px; border-top: 1px solid #f4f4f5; padding-top: 20px;">
              <p style="font-size: 13px; color: ${COLORS.textSecondary}; margin: 0;">
                Sorularınız için <a href="mailto:info@atagc.com.tr" style="${getLinkStyles()}">info@atagc.com.tr</a> adresi üzerinden bize ulaşabilirsiniz.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="${getFooterStyles()}">
            <p style="${getFooterTextStyles()}">© 2026 ATAGÇ. Tüm hakları saklıdır.</p>
            <p style="${getFooterTextStyles()} margin-top: 5px;">İTÜ GVO İzmir NESAN Yerleşkesi</p>
            
            ${type !== 'password_changed' && type !== 'account_suspended' ? 
              `<p style="${getFooterTextStyles()} margin-top: 15px; font-size: 11px; opacity: 0.6;">
                Bu e-posta, bildirim tercihleriniz doğrultusunda gönderilmiştir. 
                Ayarlarınızı <a href="${cleanBaseUrl}/dashboard/profile" style="color: ${COLORS.textSecondary}; text-decoration: underline;">profil sayfasından</a> yönetebilirsiniz.
              </p>` 
              : ''}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Change Log:
// - Updated styles for a more professional, clean look (fonts, spacing, shadows).
// - Replaced text header with the logo from `https://atagc.com.tr/logo.png`.
// - Implemented dynamic `buttonPath` to direct users to specific context pages (e.g., /dashboard/committee).
// - Rewrote all email texts to use fluent, formal Turkish language.
// - Updated `generateEmailHtml` to accept `baseUrl` and construct full links properly.