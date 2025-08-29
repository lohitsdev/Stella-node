# Stella Node.js API

A powerful Node.js API for chat and user management with MongoDB and Pinecone integration.

## 🚀 Features

- 💬 Real-time chat functionality
- 👤 User authentication and profile management
- 🔍 Semantic search with Pinecone
- 🎭 Emotion analysis with Hume AI
- 🤖 OpenAI integration
- 📊 Chat analytics and summaries

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Database**: MongoDB
- **Vector Database**: Pinecone
- **AI Services**: OpenAI, Hume AI

## 📋 API Endpoints

### Chat Endpoints

#### Get Chat IDs
```http
GET /api/chat/chatids/{email}
```
Returns chat IDs with timestamps for a specific user.

**Response Format**:
```json
{
  "success": true,
  "data": {
    "chats": [
      {
        "chat_id": "1cfe5332-8357-453c-adff-fdd42c0cb89d",
        "created_at": "2024-01-15T10:30:00.000Z",
        "started_at": "2024-01-15T10:30:00.000Z"
      }
    ],
    "count": 1
  },
  "message": "Chat IDs retrieved successfully",
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

#### Get User Sessions
```http
GET /api/chat/sessions/{email}
```
Returns full chat session data (requires authentication).

#### Search User Conversations
```http
GET /api/chat/search/user/{email}
```
Search through user's conversations with optional query parameter.

### Profile Endpoints

#### Get User Profile
```http
GET /api/auth/profile/{email}
```
Returns comprehensive user profile information.

**Response Format**:
```json
{
  "success": true,
  "data": {
    "name": "John Doe",
    "email": "user@example.com",
    "role": "user",
    "status": "verified",
    "provider": "local",
    "emailVerified": true,
    "lastLogin": "2024-01-15T10:30:00.000Z",
    "profile": {
      "avatar": "https://example.com/avatar.jpg",
      "bio": "Software developer",
      "phone": "+1234567890",
      "timezone": "UTC+0"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Profile retrieved successfully",
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

### Authentication Endpoints

#### Sign Up
```http
POST /api/auth/signup
```
Create a new user account.

#### Login
```http
POST /api/auth/login
```
Authenticate user and get access token.

#### Refresh Token
```http
POST /api/auth/refresh
```
Get new access token using refresh token.

#### Logout
```http
POST /api/auth/logout
```
Invalidate current session (requires authentication).

## 🔧 Performance Optimizations

### Database Optimization
- MongoDB connection pooling (5-10 connections)
- Strategic indexing for common queries
- Field projections to minimize data transfer

### Search Optimization
- Semantic search with relevance filtering
- Hybrid search strategy (vector + metadata)
- Result limiting and pagination

### API Response Optimization
- Lightweight endpoints with minimal data
- MongoDB projections for field selection
- Standardized response format

## 🔒 Security Features

- JWT authentication
- Password hashing
- Email verification
- Rate limiting
- Sensitive data exclusion
- Session management

## 📦 Environment Variables

```env
# MongoDB Configuration
MONGODB_URI=your_mongodb_uri
MONGODB_DATABASE=your_database_name
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=5
MONGODB_MAX_IDLE_TIME_MS=30000
MONGODB_SERVER_SELECTION_TIMEOUT_MS=5000
MONGODB_CONNECT_TIMEOUT_MS=10000

# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_environment
PINECONE_INDEX_NAME=your_index_name
PINECONE_DIMENSION=1024
PINECONE_METRIC=cosine

# Application Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

# Hume AI Configuration
HUME_API_KEY=your_hume_api_key
HUME_SECRET_KEY=your_hume_secret_key
NEXT_PUBLIC_HUME_CONFIG_ID=your_config_id

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
```

## 🚀 Getting Started

1. Clone the repository
```bash
git clone https://github.com/your-repo/stella-node.git
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server
```bash
npm run dev
```

5. Access the API documentation
```
http://localhost:3000/api-docs
```

## 📚 API Documentation

Full API documentation is available at `/api-docs` when the server is running. This includes:
- Detailed endpoint descriptions
- Request/response schemas
- Authentication requirements
- Example requests and responses

## 🔍 Health Check

The API provides health check endpoints:
- `/health` - Basic health status
- `/api/info` - Detailed API information

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for AI capabilities
- Hume AI for emotion analysis
- Pinecone for vector search
- MongoDB for database services