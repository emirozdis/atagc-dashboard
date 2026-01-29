import { supabase } from "@/lib/SERVER_supabase";
import { scrubPII, calculateDiff, getHttpContext } from "./utils";

export type LogSeverity = 'info' | 'warning' | 'error' | 'critical' | 'audit';
export type LogCategory = 'auth' | 'system' | 'database' | 'access' | 'business';

interface LogContext {
    userId?: string | null;
    req?: Request;
}

interface AuditOptions {
    action: string;
    category?: LogCategory;
    resourceType?: string;
    resourceId?: string;
    // For automatic diff generation
    prevState?: any;
    nextState?: any;
    // Additional arbitrary data
    metadata?: any; 
    reason?: string;
}

class LoggerService {
    
    /**
     * Standard info log. Good for tracking flows without saving to DB (unless configured).
     * Currently prints to console for Vercel logs.
     */
    info(message: string, meta?: any) {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[INFO] ${message}`, JSON.stringify(scrubPII(meta), null, 2));
        } else {
            console.log(JSON.stringify({ level: 'info', message, meta: scrubPII(meta) }));
        }
    }

    /**
     * Error log. Prints to console (stderr) and saves critical errors to DB.
     */
    async error(context: LogContext, message: string, error?: any) {
        console.error(`[ERROR] ${message}`, error);
        
        const { ip, userAgent } = getHttpContext(context.req);

        // Persist critical errors to DB for admin visibility
        await this.persist({
            user_id: context.userId || null,
            action: 'system_error',
            severity: 'error',
            category: 'system',
            details: {
                message,
                error: error?.message || String(error),
                stack: error?.stack
            },
            ip_address: ip,
            user_agent: userAgent
        });
    }

    /**
     * The main method for Business & Security actions.
     * Always saves to Database.
     */
    async audit(context: LogContext, opts: AuditOptions) {
        const { ip, userAgent } = getHttpContext(context.req);

        let diff = null;
        if (opts.prevState || opts.nextState) {
            diff = calculateDiff(opts.prevState || {}, opts.nextState || {});
        }

        const details = {
            ...opts.metadata,
            reason: opts.reason,
            changes: diff, // The calculated diff
            snapshot: opts.nextState ? scrubPII(opts.nextState) : undefined 
        };

        // Console echo for realtime debugging
        if (process.env.NODE_ENV === 'development') {
            console.log(`[AUDIT] ${opts.action}`, details);
        }

        await this.persist({
            user_id: context.userId || null,
            action: opts.action,
            severity: 'audit',
            category: opts.category || 'business',
            resource_id: opts.resourceId || null,
            resource_type: opts.resourceType || null,
            details: scrubPII(details),
            ip_address: ip,
            user_agent: userAgent
        });
    }

    /**
     * Internal method to write to Supabase
     */
    private async persist(payload: any) {
        try {
            const { error } = await supabase.from("logs").insert({
                ...payload,
                created_at: new Date().toISOString()
            });
            
            if (error) {
                console.error("FAILED TO WRITE LOG TO DB:", error);
            }
        } catch (e) {
            console.error("Logger exception:", e);
        }
    }
}

export const Logger = new LoggerService();