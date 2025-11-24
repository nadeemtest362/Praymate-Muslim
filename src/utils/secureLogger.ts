/**
 * Secure Logger Utility
 * 
 * This utility provides secure logging that automatically sanitizes PII and sensitive data
 * before logging. It prevents accidental exposure of user data in production logs.
 * 
 * Usage:
 * import { secureLog } from '@/utils/secureLogger';
 * secureLog.info('User authentication successful', { userId: user.id }); // Will sanitize userId
 */

// @ts-ignore - __DEV__ is globally available
const __DEV__ = global.__DEV__ || false;

// Patterns to identify and sanitize sensitive data
const SENSITIVE_PATTERNS = {
  // User identifiers
  userId: /user[_-]?id|user[_-]?uid|uid|id/i,
  email: /email|e[_-]?mail/i,
  phone: /phone|mobile|cell/i,
  name: /name|first[_-]?name|last[_-]?name|display[_-]?name/i,
  
  // Authentication data
  token: /token|jwt|bearer|auth[_-]?token|access[_-]?token|refresh[_-]?token/i,
  password: /password|pwd|pass/i,
  session: /session[_-]?id|session[_-]?token/i,
  
  // Other sensitive data
  address: /address|street|city|zip|postal/i,
  ssn: /ssn|social[_-]?security/i,
  credit: /credit[_-]?card|card[_-]?number|ccn/i,
};

// Values that should be completely redacted
const REDACT_VALUES = [
  'password', 'token', 'jwt', 'session', 'secret', 'key', 'auth'
];

/**
 * Sanitizes an object by replacing sensitive values with [REDACTED] or truncated versions
 */
function sanitizeObject(obj: any, depth: number = 0): any {
  if (depth > 3) return '[MAX_DEPTH_REACHED]'; // Prevent infinite recursion
  
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (typeof obj === 'object') {
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeObject(item, depth + 1));
    }
    
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Check if key matches sensitive patterns
      let shouldRedact = false;
      for (const regex of Object.values(SENSITIVE_PATTERNS)) {
        if (regex.test(lowerKey)) {
          shouldRedact = true;
          break;
        }
      }
      
      // Check if key contains redact values
      if (!shouldRedact) {
        shouldRedact = REDACT_VALUES.some(redactValue => 
          lowerKey.includes(redactValue.toLowerCase())
        );
      }
      
      if (shouldRedact) {
        if (typeof value === 'string' && value.length > 0) {
          // For user IDs and similar, show first few characters
          if (SENSITIVE_PATTERNS.userId.test(lowerKey)) {
            sanitized[key] = `${value.substring(0, 8)}...`;
          } else {
            sanitized[key] = '[REDACTED]';
          }
        } else {
          sanitized[key] = '[REDACTED]';
        }
      } else {
        sanitized[key] = sanitizeObject(value, depth + 1);
      }
    }
    
    return sanitized;
  }
  
  return obj;
}

/**
 * Sanitizes string values that might contain sensitive data
 */
function sanitizeString(str: string): string {
  if (!str || typeof str !== 'string') return str;
  
  // Email pattern
  str = str.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]');
  
  // Phone pattern (US format)
  str = str.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE_REDACTED]');
  
  // UUID pattern (common for user IDs)
  str = str.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[UUID_REDACTED]');
  
  // JWT pattern (basic detection)
  str = str.replace(/\beyJ[A-Za-z0-9-_]*\.[A-Za-z0-9-_]*\.[A-Za-z0-9-_]*\b/g, '[JWT_REDACTED]');
  
  return str;
}

/**
 * Formats log message with timestamp and level
 */
function formatLogMessage(level: string, message: string, data?: any): string {
  const timestamp = new Date().toISOString();
  const sanitizedData = data ? sanitizeObject(data) : '';
  const dataStr = sanitizedData ? ` | Data: ${JSON.stringify(sanitizedData)}` : '';
  
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
}

/**
 * Secure logger interface
 */
export const secureLog = {
  /**
   * Log informational messages
   */
  info: (message: string, data?: any) => {
    if (__DEV__) {
      console.log(formatLogMessage('info', message, data));
    }
  },
  
  /**
   * Log warning messages
   */
  warn: (message: string, data?: any) => {
    if (__DEV__) {
      console.warn(formatLogMessage('warn', message, data));
    }
  },
  
  /**
   * Log error messages (always logs, even in production, but sanitized)
   */
  error: (message: string, error?: any, data?: any) => {
    const errorData = {
      error: error instanceof Error ? { 
        message: error.message, 
        stack: __DEV__ ? error.stack : '[STACK_REDACTED]' 
      } : error,
      ...data
    };
    
    console.error(formatLogMessage('error', message, errorData));
  },
  
  /**
   * Log debug messages (only in development)
   */
  debug: (message: string, data?: any) => {
    if (__DEV__) {
      console.log(formatLogMessage('debug', message, data));
    }
  },
  
  /**
   * Log messages that should appear in production (use sparingly and ensure no PII)
   */
  production: (message: string, data?: any) => {
    console.log(formatLogMessage('prod', message, data));
  }
};

/**
 * Legacy console.log replacement - use this to gradually replace existing console.log calls
 * This will show a warning in development to encourage migration to secureLog
 */
export const legacyLog = (message: string, ...args: any[]) => {
  if (__DEV__) {
    console.warn('⚠️ LEGACY LOGGING DETECTED - Please migrate to secureLog utility');
    console.log(formatLogMessage('legacy', message, args.length > 0 ? args : undefined));
  }
};

// Export sanitization functions for testing
export const _testExports = {
  sanitizeObject,
  sanitizeString,
  SENSITIVE_PATTERNS
};