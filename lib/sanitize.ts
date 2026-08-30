import sanitizeHtmlLibrary from "sanitize-html";

export function sanitizeHtml(html: string): string {
  return sanitizeHtmlLibrary(html, {
    allowedTags: [
      "b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li",
      "h1", "h2", "h3", "u", "s", "blockquote", "span",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      span: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
  });
}

/* Change Log:
- Created sanitization utility to prevent XSS in rich text content (Announcements, Editor).
*/
