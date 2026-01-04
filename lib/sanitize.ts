import DOMPurify from "isomorphic-dompurify";

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 
      'h1', 'h2', 'h3', 'u', 's', 'blockquote', 'span'
    ],
    ALLOWED_ATTR: ['href', 'target', 'style', 'class'],
  });
}

/* Change Log:
- Created sanitization utility to prevent XSS in rich text content (Announcements, Editor).
*/