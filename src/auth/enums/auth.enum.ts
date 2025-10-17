/**
 * User roles enumeration
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator'
}

/**
 * Authentication status enumeration
 */
export enum AuthStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  SUSPENDED = 'suspended',
  BLOCKED = 'blocked'
}

/**
 * Token types enumeration
 */
export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
  RESET_PASSWORD = 'reset_password',
  EMAIL_VERIFICATION = 'email_verification'
}

/**
 * Authentication provider enumeration
 */
export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  GITHUB = 'github',
  APPLE = 'apple'
}
