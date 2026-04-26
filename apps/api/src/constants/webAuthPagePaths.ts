/**
 * Web app route paths and query param prefix for account emails (verify / reset / email-change).
 * Must match `apps/web` App Router; token is appended by mailers.
 */
export const emailChangeVerificationPagePath = '/verify-email-change?token=';
export const resetPasswordPagePath = '/reset-password?token=';
export const verifyEmailPagePath = '/verify-email?token=';
