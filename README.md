# Stella - Node.js TypeScript Project with MongoDB & Pinecone

A modern Node.js application built with TypeScript, featuring MongoDB for document storage and Pinecone for vector search capabilities. Organized using feature-based architecture.

## 🚀 Features

- **TypeScript** - Full type safety and modern JavaScript features
- **MongoDB** - Document database for storing application data
- **Pinecone** - Vector database for similarity search and AI applications
- **Feature-based Architecture** - Organized by domain/feature modules
- **Class Validator** - Robust DTO validation with decorators
- **Swagger Documentation** - Interactive API documentation
- **ConfigService** - NestJS-style configuration management
- **Modern tooling** - ES Modules, tsx for fast TypeScript execution

## 📦 Project Structure

```
stella/
├── src/
│   ├── auth/                     # Authentication module
│   │   ├── dto/
│   │   │   └── signup.dto.ts     # Auth DTOs with validation
│   │   ├── schemas/
│   │   │   └── auth.schema.ts    # MongoDB schemas
│   │   ├── interfaces/
│   │   │   └── auth.interface.ts # Auth interfaces
│   │   ├── enums/
│   │   │   └── auth.enum.ts      # Auth enumerations
│   │   └── index.ts              # Module exports
│   ├── documents/                # Document management module
│   │   ├── dto/
│   │   │   └── document.dto.ts   # Document DTOs
│   │   ├── schemas/
│   │   │   └── document.schema.ts# Document schemas
│   │   ├── interfaces/
│   │   │   └── document.interface.ts # Document interfaces
│   │   ├── enums/
│   │   │   └── document.enum.ts  # Document enumerations
│   │   └── index.ts              # Module exports
│   ├── vectors/                  # Vector operations module
│   │   ├── dto/
│   │   │   └── vector.dto.ts     # Vector DTOs
│   │   ├── schemas/
│   │   │   └── vector.schema.ts  # Vector schemas
│   │   ├── interfaces/
│   │   │   └── vector.interface.ts # Vector interfaces
│   │   ├── enums/
│   │   │   └── vector.enum.ts    # Vector enumerations
│   │   └── index.ts              # Module exports
│   ├── common/                   # Shared/global components
│   │   ├── dto/
│   │   │   └── pagination.dto.ts # Common DTOs
│   │   ├── schemas/
│   │   │   └── app.schema.ts     # Global schemas
│   │   ├── interfaces/
│   │   │   ├── config.interface.ts    # Configuration interfaces
│   │   │   ├── database.interface.ts  # Database interfaces
│   │   │   └── service.interface.ts   # Service interfaces
│   │   ├── enums/
│   │   │   └── app.enum.ts       # Global enumerations
│   │   └── index.ts              # Module exports
│   ├── config/
│   │   └── swagger.config.ts     # OpenAPI 3.0 configuration
│   ├── database/
│   │   ├── mongodb.ts           # MongoDB connection
│   │   └── pinecone.ts          # Pinecone connection
│   ├── services/
│   │   ├── config.service.ts     # NestJS-style ConfigService
│   │   └── validation.service.ts # DTO validation service
│   ├── examples/
│   │   └── vector-search.ts      # Vector search examples
│   ├── scripts/
│   │   └── start-api.ts          # Alternative startup script
│   ├── app.ts                    # Express application with Swagger
│   └── index.ts                  # Main entry point
├── dist/                         # Compiled JavaScript output
├── .env.example                  # Environment variables template
├── config.example.env            # Additional config example
└── README.md                     # This file
```

## 🛠️ Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your actual configuration:
   ```env
   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/stella
   
   # Pinecone Configuration
   PINECONE_API_KEY=your_pinecone_api_key_here
   PINECONE_ENVIRONMENT=your_pinecone_environment_here
   PINECONE_INDEX_NAME=stella-index
   ```

## 🚀 Usage

### Development Mode
```bash
npm run dev          # Main application
npm run dev:api      # API server with alternative startup
```

### Build for Production
```bash
npm run build
```

### Run Production Build
```bash
npm start           # Main application
npm start:api       # API server
```

### Direct TypeScript Execution
```bash
node --import tsx src/index.ts
```

## 💾 Database Setup

### MongoDB
- Install MongoDB locally or use MongoDB Atlas
- Update `MONGODB_URI` in your `.env` file
- The application will automatically connect and create collections as needed

### Pinecone
1. Create a Pinecone account at [pinecone.io](https://pinecone.io)
2. Create a new index with your desired dimensions
3. Get your API key and environment from the Pinecone console
4. Update the Pinecone configuration in your `.env` file

## 📚 API Examples

### Authentication
```typescript
import { SignupDto, LoginDto, UserRole } from './auth';

// User signup
const signupData: SignupDto = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  password: 'securepassword',
  role: UserRole.USER
};
```

### Document Management
```typescript
import { CreateDocumentDto, DocumentType } from './documents';

// Create document
const documentData: CreateDocumentDto = {
  message: 'Document content',
  type: DocumentType.TEXT,
  timestamp: new Date(),
  metadata: { category: 'important' }
};
```

### Vector Operations
```typescript
import { VectorQueryDto, VectorMetric } from './vectors';

// Query vectors
const queryData: VectorQueryDto = {
  vector: [0.1, 0.2, 0.3, ...],
  topK: 5,
  includeMetadata: true
};
```

### Using Common Components
```typescript
import { PaginationDto, SortOrder, Environment } from './common';

// Pagination
const pagination: PaginationDto = {
  page: 1,
  limit: 10,
  sortBy: 'createdAt',
  sortOrder: SortOrder.DESC
};
```

## 🎯 Architecture Benefits

### 🏗️ **Feature-Based Organization**
- **Modularity**: Each feature is self-contained with its own DTOs, schemas, interfaces, and enums
- **Scalability**: Easy to add new features without affecting existing ones
- **Maintainability**: Related code is grouped together, reducing cognitive load

### 🔧 **Type Safety**
- **DTOs**: Input validation with class-validator decorators
- **Interfaces**: Clear contracts for data structures and services
- **Enums**: Type-safe constants and options
- **Schemas**: Database validation and indexing

### 📖 **Developer Experience**
- **Clean Imports**: Use feature modules (`import { SignupDto } from './auth'`)
- **Swagger Documentation**: Interactive API docs at `/api-docs`
- **ConfigService**: Type-safe configuration management
- **Validation Service**: Centralized DTO validation

## 🔧 Configuration

The application uses a centralized configuration system:

```typescript
// Access configuration
const port = configService.get('app.port');
const mongoUri = configService.get('mongodb.uri');
const pineconeKey = configService.get('pinecone.apiKey');

// With default values
const timeout = configService.get('app.timeout', 5000);
```

## 🧪 Testing

```bash
npm test
```

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `PINECONE_API_KEY` | Pinecone API key | Yes |
| `PINECONE_ENVIRONMENT` | Pinecone environment | Yes |
| `PINECONE_INDEX_NAME` | Pinecone index name | No (default: stella-index) |
| `PORT` | Application port | No (default: 3000) |
| `NODE_ENV` | Environment mode | No (default: development) |

## 🎯 Use Cases

This project template is perfect for:
- **AI/ML Applications** - Vector similarity search for embeddings
- **Document Management** - Full-text search with semantic similarity
- **User Authentication** - Complete auth system with roles and permissions
- **API Development** - Well-structured REST APIs with documentation
- **Microservices** - Feature-based architecture ready for service extraction

## 🚀 API Endpoints

- **📖 Swagger Documentation:** `http://localhost:3000/api-docs`
- **💚 Health Check:** `http://localhost:3000/health`
- **ℹ️ API Info:** `http://localhost:3000/api/info`
- **📋 Swagger JSON:** `http://localhost:3000/swagger.json`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add your feature following the established patterns
4. Add tests if applicable
5. Submit a pull request

## 📄 License

ISC License - see package.json for details.

---

## 🌟 **Key Improvements in This Version**

✅ **Feature-Based Architecture** - Organized by domain instead of file type  
✅ **Complete Authentication Module** - With DTOs, schemas, interfaces, and enums  
✅ **Document Management Module** - Full CRUD operations support  
✅ **Vector Operations Module** - Comprehensive vector search capabilities  
✅ **Common Components** - Shared utilities and types  
✅ **Clean Module Exports** - Easy-to-use imports for each feature  
✅ **Enhanced Swagger Documentation** - Complete API documentation  
✅ **Type-Safe Configuration** - Robust configuration management  

This architecture follows modern best practices and is ready for production scaling! 🚀