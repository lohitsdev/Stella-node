# 🔐 Authentication API Guide for Frontend

This guide provides comprehensive documentation for using the Stella authentication endpoints in your frontend application.

## 🚀 Base URL
```
http://localhost:3000/api/auth
```

## 📋 Available Endpoints

### 1. 🔧 **User Signup**

**Endpoint:** `POST /api/auth/signup`

**Request Body:**
```json
{
  "name": "John Doe", 
  "email": "john.doe@example.com",
  "password": "SecurePassword123!",
  "role": "USER"  // Optional: "USER" | "ADMIN" | "MODERATOR"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "64f8c9e123456789abcdef12",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "USER",
      "status": "VERIFIED",
      "emailVerified": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 86400,
      "tokenType": "Bearer"
    }
  },
  "message": "User created successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**

**400 Bad Request - Validation Error:**
```json
{
  "success": false,
  "error": "Validation failed: email must be a valid email",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**409 Conflict - User Already Exists:**
```json
{
  "success": false,
  "error": "User already exists with this email",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### 2. 🔑 **User Login**

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "64f8c9e123456789abcdef12",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "USER",
      "lastLogin": "2024-01-01T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 86400,
      "tokenType": "Bearer"
    }
  },
  "message": "Login successful",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**

**400 Bad Request - Validation Error:**
```json
{
  "success": false,
  "error": "Validation failed: email must be a valid email",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**401 Unauthorized - Invalid Credentials:**
```json
{
  "success": false,
  "error": "Invalid email or password",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**401 Unauthorized - Account Locked:**
```json
{
  "success": false,
  "error": "Account is temporarily locked. Please try again later.",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**403 Forbidden - Account Suspended/Blocked:**
```json
{
  "success": false,
  "error": "Account is suspended. Please contact support.",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### 3. 🔄 **Refresh Token**

**Endpoint:** `POST /api/auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "tokenType": "Bearer"
  },
  "message": "Token refreshed successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**

**401 Unauthorized - Invalid Token:**
```json
{
  "success": false,
  "error": "Invalid or expired refresh token",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### 4. 🚪 **User Logout**

**Endpoint:** `POST /api/auth/logout`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Logout successful",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**

**401 Unauthorized - Missing/Invalid Token:**
```json
{
  "success": false,
  "error": "Access token is required",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 🛡️ Frontend Implementation Examples

### React/JavaScript Example

```javascript
class AuthService {
  constructor() {
    this.baseURL = 'http://localhost:3000/api/auth';
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  // Signup
  async signup(userData) {
    try {
      const response = await fetch(`${this.baseURL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();
      
      if (data.success) {
        this.setTokens(data.data.tokens);
        return { success: true, user: data.data.user };
      }
      
      return { success: false, error: data.error };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  // Login
  async login(email, password) {
    try {
      const response = await fetch(`${this.baseURL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (data.success) {
        this.setTokens(data.data.tokens);
        return { success: true, user: data.data.user };
      }
      
      return { success: false, error: data.error };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  // Logout
  async logout() {
    try {
      const response = await fetch(`${this.baseURL}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });

      this.clearTokens();
      return { success: true };
    } catch (error) {
      this.clearTokens();
      return { success: false, error: 'Logout failed' };
    }
  }

  // Refresh tokens
  async refreshTokens() {
    try {
      const response = await fetch(`${this.baseURL}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });

      const data = await response.json();
      
      if (data.success) {
        this.setTokens(data.data);
        return { success: true };
      }
      
      this.clearTokens();
      return { success: false };
    } catch (error) {
      this.clearTokens();
      return { success: false };
    }
  }

  // Helper methods
  setTokens(tokens) {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  isAuthenticated() {
    return !!this.accessToken;
  }

  // Axios interceptor for automatic token refresh
  setupAxiosInterceptors() {
    axios.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.refreshToken) {
          const refreshResult = await this.refreshTokens();
          if (refreshResult.success) {
            // Retry the original request
            error.config.headers.Authorization = `Bearer ${this.accessToken}`;
            return axios.request(error.config);
          }
        }
        return Promise.reject(error);
      }
    );
  }
}

// Usage
const authService = new AuthService();
authService.setupAxiosInterceptors();

// Signup
const signupResult = await authService.signup({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'SecurePassword123!'
});

// Login
const loginResult = await authService.login('john@example.com', 'SecurePassword123!');

// Logout
const logoutResult = await authService.logout();
```

---

## ⚠️ Important Error Codes for Frontend

| Status Code | Meaning | Frontend Action |
|-------------|---------|-----------------|
| `201` | Created | User registered successfully |
| `200` | OK | Request successful |
| `400` | Bad Request | Show validation errors to user |
| `401` | Unauthorized | Redirect to login, clear tokens |
| `403` | Forbidden | Show "Account restricted" message |
| `409` | Conflict | User already exists - redirect to login |
| `500` | Server Error | Show "Try again later" message |

---

## 🔒 Security Best Practices

1. **Store tokens securely**: Use `localStorage` or `sessionStorage` (avoid cookies for SPA)
2. **Implement auto-refresh**: Set up interceptors to refresh tokens automatically
3. **Handle 401 errors**: Redirect to login when access token expires
4. **Clear tokens on logout**: Always clear stored tokens
5. **Validate forms**: Implement client-side validation for better UX
6. **HTTPS only**: Use HTTPS in production
7. **Token expiry**: Handle token expiry gracefully

---

## 📚 Additional Resources

- **Interactive API Docs**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health
- **API Info**: http://localhost:3000/api/info

---

## 🎯 User Collection Schema

Users are saved in MongoDB with the following structure:

```json
{
  "_id": "ObjectId",
  "name": "string", 
  "email": "string (unique)",
  "password": "string (hashed)",
  "role": "USER | ADMIN | MODERATOR",
  "status": "ACTIVE | INACTIVE | SUSPENDED | BLOCKED | VERIFIED",
  "provider": "LOCAL | GOOGLE | FACEBOOK",
  "emailVerified": "boolean",
  "loginAttempts": "number",
  "lockUntil": "Date (optional)",
  "lastLogin": "Date (optional)",
  "refreshTokens": ["array of strings"],
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

The password is automatically hashed using bcrypt with salt rounds of 12 for maximum security.

---

Happy coding! 🚀