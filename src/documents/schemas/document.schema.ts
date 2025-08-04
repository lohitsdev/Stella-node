/**
 * MongoDB schema definition for Documents collection
 */
export const DocumentSchema = {
  name: 'documents',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['message', 'type', 'timestamp'],
      properties: {
        message: {
          bsonType: 'string',
          minLength: 1,
          maxLength: 10000,
          description: 'Document message is required and must be 1-10000 characters'
        },
        type: {
          bsonType: 'string',
          minLength: 1,
          maxLength: 100,
          description: 'Document type is required and must be 1-100 characters'
        },
        timestamp: {
          bsonType: 'date',
          description: 'Document timestamp is required'
        },
        metadata: {
          bsonType: ['object', 'null'],
          description: 'Additional metadata for the document'
        }
      }
    }
  },
  indexes: [
    { key: { type: 1 } },
    { key: { timestamp: -1 } },
    { key: { message: 'text' } }, // Text index for search
    { key: { 'metadata.category': 1 }, sparse: true },
    { key: { createdAt: -1 } }
  ]
};

/**
 * Schema for creating document indexes
 */
export const createDocumentIndexes = async (collection: any) => {
  await Promise.all(
    DocumentSchema.indexes.map(index => 
      collection.createIndex(index.key, {
        sparse: index.sparse
      })
    )
  );
};