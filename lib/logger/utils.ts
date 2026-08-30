/**
 * Recursively scrubs sensitive fields from objects before logging.
 */
const SENSITIVE_KEYS = [
    'password', 'password_hash', 'token', 'secret', 
    'authorization', 'cookie', 'verification_code', 'code'
];

export function scrubPII(data: unknown): unknown {
    if (!data) return data;
    
    if (Array.isArray(data)) {
        return data.map(item => scrubPII(item));
    }

    if (typeof data === 'object') {
        const cleaned: Record<string, unknown> = {};
        const record = data as Record<string, unknown>;
        for (const key in record) {
            if (Object.prototype.hasOwnProperty.call(record, key)) {
                if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) {
                    cleaned[key] = '[REDACTED]';
                } else if (typeof record[key] === 'object') {
                    cleaned[key] = scrubPII(record[key]);
                } else {
                    cleaned[key] = record[key];
                }
            }
        }
        return cleaned;
    }

    return data;
}

/**
 * Calculates the deep difference between two objects.
 * Returns an object containing flattened keys of changes.
 * Format: { "key.subkey": { from: oldVal, to: newVal } }
 */
export function calculateDiff(oldVal: unknown, newVal: unknown, prefix = ""): Record<string, { from: unknown, to: unknown }> | null {
    // 1. Identical Check
    if (oldVal === newVal) return null;
    
    // Normalize undefined to null for comparison
    const v1 = oldVal === undefined ? null : oldVal;
    const v2 = newVal === undefined ? null : newVal;

    if (JSON.stringify(v1) === JSON.stringify(v2)) return null;

    // Helper to check if value is an object (and not null)
    // We treat Arrays as objects here to recurse into indices
    const isObject = (v: unknown): v is Record<string, unknown> | unknown[] => Boolean(v) && typeof v === 'object';

    // 2. If one side is primitive (or null), or if types mismatch (e.g. object vs array), return direct diff
    if (!isObject(v1) || !isObject(v2) || (Array.isArray(v1) !== Array.isArray(v2))) {
        // If we are at the root (prefix empty) and values are different, return generic key if objects
        const key = prefix || "root";
        return { [key]: { from: v1, to: v2 } };
    }

    // 3. Both are objects/arrays: Recurse keys
    const diffs: Record<string, { from: unknown, to: unknown }> = {};
    const record1 = v1 as Record<string, unknown>;
    const record2 = v2 as Record<string, unknown>;
    const keys = new Set([...Object.keys(record1), ...Object.keys(record2)]);

    keys.forEach(key => {
        // Skip ignored fields
        if (['updated_at', 'created_at', 'password_hash'].includes(key)) return;

        const path = prefix ? `${prefix}.${key}` : key;
        const subDiff = calculateDiff(record1[key], record2[key], path);
        
        if (subDiff) {
            Object.assign(diffs, subDiff);
        }
    });

    return Object.keys(diffs).length > 0 ? diffs : null;
}

/**
 * Helper to extract standard HTTP context
 */
export function getHttpContext(req?: Request) {
    if (!req) return { ip: null, userAgent: null };
    const forwarded = req.headers.get("x-forwarded-for");
    return {
        ip: forwarded ? forwarded.split(",")[0] : "127.0.0.1",
        userAgent: req.headers.get("user-agent"),
        method: req.method,
        url: req.url
    };
}
