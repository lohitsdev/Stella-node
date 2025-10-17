import { UserRole, AuthStatus, AuthProvider } from '../enums/auth.enum.js';

/**
 * MongoDB schema definition for User collection
 */
export const UserSchema = {
  name: 'users',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: [
        'firstName',
        'lastName',
        'email',
        'password',
        'role',
        'status',
        'provider',
        'emailVerified',
        'createdAt'
      ],
      properties: {
        firstName: {
          bsonType: 'string',
          minLength: 2,
          maxLength: 50,
          description: 'User first name is required and must be 2-50 characters'
        },
        lastName: {
          bsonType: 'string',
          minLength: 2,
          maxLength: 50,
          description: 'User last name is required and must be 2-50 characters'
        },
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
          description: 'User email is required and must be valid'
        },
        password: {
          bsonType: 'string',
          minLength: 8,
          description: 'Password is required and must be at least 8 characters'
        },
        role: {
          bsonType: 'string',
          enum: Object.values(UserRole),
          description: 'User role must be one of: admin, user, moderator'
        },
        status: {
          bsonType: 'string',
          enum: Object.values(AuthStatus),
          description: 'User status must be one of: pending, verified, suspended, blocked'
        },
        provider: {
          bsonType: 'string',
          enum: Object.values(AuthProvider),
          description: 'Auth provider must be one of: local, google, github, apple'
        },
        emailVerified: {
          bsonType: 'bool',
          description: 'Email verification status'
        },
        emailVerificationToken: {
          bsonType: ['string', 'null'],
          description: 'Token for email verification'
        },
        passwordResetToken: {
          bsonType: ['string', 'null'],
          description: 'Token for password reset'
        },
        passwordResetExpires: {
          bsonType: ['date', 'null'],
          description: 'Password reset token expiration'
        },
        lastLogin: {
          bsonType: ['date', 'null'],
          description: 'Last login timestamp'
        },
        loginAttempts: {
          bsonType: 'int',
          minimum: 0,
          description: 'Number of failed login attempts'
        },
        lockUntil: {
          bsonType: ['date', 'null'],
          description: 'Account lock expiration'
        },
        refreshTokens: {
          bsonType: 'array',
          items: {
            bsonType: 'string'
          },
          description: 'Array of valid refresh tokens'
        },
        createdAt: {
          bsonType: 'date',
          description: 'Account creation timestamp'
        },
        updatedAt: {
          bsonType: 'date',
          description: 'Last update timestamp'
        },
        profile: {
          bsonType: ['object', 'null'],
          properties: {
            avatar: {
              bsonType: ['string', 'null'],
              description: 'User avatar URL'
            },
            bio: {
              bsonType: ['string', 'null'],
              maxLength: 500,
              description: 'User biography'
            },
            phone: {
              bsonType: ['string', 'null'],
              description: 'User phone number'
            },
            timezone: {
              bsonType: ['string', 'null'],
              description: 'User timezone'
            }
          }
        }
      }
    }
  },
  indexes: [
    { key: { email: 1 }, unique: true },
    { key: { emailVerificationToken: 1 }, sparse: true },
    { key: { passwordResetToken: 1 }, sparse: true },
    { key: { createdAt: 1 } },
    { key: { status: 1 } },
    { key: { role: 1 } }
  ]
};

/**
 * Schema for creating user indexes
 */
export const createUserIndexes = async (collection: any) => {
  await Promise.all(
    UserSchema.indexes.map(index =>
      collection.createIndex(index.key, {
        unique: index.unique,
        sparse: index.sparse
      })
    )
  );
};
