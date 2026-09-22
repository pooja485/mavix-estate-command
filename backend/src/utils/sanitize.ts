import { z } from 'zod';

/**
 * Escapes HTML-special characters. This is the authoritative XSS defense
 * for this app: the frontend (app-legacy.js) renders many fields straight
 * into innerHTML template strings, so any free-text field a tenant user
 * can set (names, descriptions, titles, reasons, ...) must be neutralized
 * here, on write, before it's ever stored — never rely on the browser to
 * sanitize its own input, since the API can be called directly (curl,
 * Postman, a future mobile client) bypassing the web UI entirely.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** A Zod string schema that HTML-escapes its value after validation. Use for any free-text field the frontend later renders via innerHTML. */
export function htmlSafeString(schema: z.ZodString = z.string()) {
  return schema.transform(escapeHtml);
}
