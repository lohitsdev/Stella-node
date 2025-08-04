import swaggerJSDoc from 'swagger-jsdoc';
import type { SwaggerDefinition, Options } from 'swagger-jsdoc';
import { configService } from '../services/config.service.js';

/**
 * Swagger configuration for API documentation
 */
const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Stella API',
    version: '1.0.0',
    description: 'A Node.js TypeScript API with MongoDB and Pinecone for vector search capabilities',
    contact: {
      name: 'Stella API Support',
      email: 'support@stella.api'
    },
    license: {
      name: 'ISC',
      url: 'https://opensource.org/licenses/ISC'
    }
  },
  servers: [
    {
      url: `http://localhost:${configService.get('app.port')}`,
      description: 'Development server'
    },
    {
      url: 'https://api.stella.com',
      description: 'Production server'
    }
  ],
  components: {
    schemas: {
      // Authentication schemas
      SignupDto: {
        type: 'object',
        required: ['firstName', 'lastName', 'email', 'password'],
        properties: {
          firstName: {
            type: 'string',
            minLength: 2,
            description: 'User first name'
          },
          lastName: {
            type: 'string', 
            minLength: 2,
            description: 'User last name'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address'
          },
          password: {
            type: 'string',
            minLength: 8,
            description: 'User password'
          },
          role: {
            type: 'string',
            enum: ['admin', 'user', 'moderator'],
            description: 'User role'
          }
        }
      },
      LoginDto: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address'
          },
          password: {
            type: 'string',
            description: 'User password'
          }
        }
      },
      // Document schemas  
      CreateDocumentDto: {
        type: 'object',
        required: ['message', 'type'],
        properties: {
          message: {
            type: 'string',
            minLength: 1,
            description: 'The content of the document'
          },
          type: {
            type: 'string',
            description: 'The type/category of the document'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'When the document was created'
          },
          metadata: {
            type: 'object',
            additionalProperties: true,
            description: 'Additional metadata for the document'
          }
        }
      },
      DocumentResponseDto: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique identifier of the document'
          },
          message: {
            type: 'string',
            description: 'The content of the document'
          },
          type: {
            type: 'string',
            description: 'The type/category of the document'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'When the document was created'
          },
          metadata: {
            type: 'object',
            additionalProperties: true,
            description: 'Additional metadata for the document'
          }
        }
      },
      // Vector schemas
      VectorQueryDto: {
        type: 'object',
        required: ['vector', 'topK'],
        properties: {
          vector: {
            type: 'array',
            items: {
              type: 'number'
            },
            description: 'The query vector for similarity search'
          },
          topK: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            description: 'Number of most similar vectors to return'
          },
          includeMetadata: {
            type: 'boolean',
            description: 'Whether to include metadata in results'
          }
        }
      },
      VectorSearchResultDto: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique identifier of the vector'
          },
          score: {
            type: 'number',
            description: 'Similarity score (0-1)'
          },
          metadata: {
            type: 'object',
            additionalProperties: true,
            description: 'Additional metadata for the vector'
          }
        }
      },
      // Common schemas
      PaginationDto: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            minimum: 1,
            default: 1,
            description: 'Page number'
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10,
            description: 'Number of items per page'
          },
          sortBy: {
            type: 'string',
            default: 'createdAt',
            description: 'Field to sort by'
          },
          sortOrder: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc',
            description: 'Sort order'
          }
        }
      },
      ServiceResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Whether the operation was successful'
          },
          data: {
            description: 'The response data'
          },
          message: {
            type: 'string',
            description: 'Success message'
          },
          error: {
            type: 'string',
            description: 'Error message if operation failed'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'When the response was generated'
          }
        }
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['healthy', 'unhealthy'],
            description: 'Overall health status'
          },
          services: {
            type: 'object',
            properties: {
              mongodb: {
                type: 'boolean',
                description: 'MongoDB connection status'
              },
              pinecone: {
                type: 'boolean',
                description: 'Pinecone connection status'
              }
            }
          },
          uptime: {
            type: 'number',
            description: 'Application uptime in seconds'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'When the health check was performed'
          }
        }
      }
    },
    responses: {
      BadRequest: {
        description: 'Bad Request - Invalid input data',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ServiceResponse'
            }
          }
        }
      },
      Unauthorized: {
        description: 'Unauthorized - Authentication required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ServiceResponse'
            }
          }
        }
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ServiceResponse'
            }
          }
        }
      },
      InternalServerError: {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ServiceResponse'
            }
          }
        }
      }
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication operations'
    },
    {
      name: 'Documents',
      description: 'Document management operations'
    },
    {
      name: 'Vectors',
      description: 'Vector operations and similarity search'
    },
    {
      name: 'Health',
      description: 'Health check and monitoring'
    }
  ]
};

const options: Options = {
  definition: swaggerDefinition,
  apis: [
    './src/auth/**/*.ts',
    './src/documents/**/*.ts',
    './src/vectors/**/*.ts',
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './dist/auth/**/*.js',
    './dist/documents/**/*.js',
    './dist/vectors/**/*.js',
    './dist/routes/*.js',
    './dist/controllers/*.js'
  ]
};

export const swaggerSpec = swaggerJSDoc(options);
export default swaggerSpec;