import { mongodb } from '../database/mongodb.js';
import { pinecone } from '../database/pinecone.js';
import { ObjectId } from 'mongodb';
import type { IVector, IVectorQueryResult } from '../vectors/interfaces/vector.interface.js';
import type { IDocument } from '../documents/interfaces/document.interface.js';

/**
 * Example demonstrating how to use MongoDB and Pinecone together
 * for storing documents with vector embeddings
 */
export class VectorSearchExample {
  
  async storeDocumentWithVector(
    document: Omit<IDocument, '_id'>, 
    embedding: number[]
  ): Promise<string> {
    try {
      // Store document in MongoDB
      const collection = mongodb.getCollection<IDocument>('documents');
      const mongoResult = await collection.insertOne(document as IDocument);
      const documentId = mongoResult.insertedId.toString();

      // Store vector in Pinecone
      const index = await pinecone.getIndex();
      const vectorData: IVector = {
        id: documentId,
        values: embedding,
        metadata: {
          message: document.message,
          type: document.type,
          timestamp: document.timestamp.toISOString()
        }
      };

      await index.upsert([vectorData]);

      console.log(`✅ Stored document ${documentId} in both MongoDB and Pinecone`);
      return documentId;
    } catch (error) {
      console.error('❌ Error storing document with vector:', error);
      throw error;
    }
  }

  async searchSimilarDocuments(
    queryVector: number[], 
    topK: number = 5
  ): Promise<IDocument[]> {
    try {
      // Search similar vectors in Pinecone
      const index = await pinecone.getIndex();
      const queryResponse = await index.query({
        vector: queryVector,
        topK,
        includeMetadata: true
      });

      if (!queryResponse.matches) {
        return [];
      }

      // Get document IDs from Pinecone results
      const documentIds = queryResponse.matches.map((match: any) => new ObjectId(match.id));

      // Fetch full documents from MongoDB
      const collection = mongodb.getCollection<IDocument>('documents');
      const documents = await collection.find({
        _id: { $in: documentIds }
      }).toArray();

      console.log(`🔍 Found ${documents.length} similar documents`);
      return documents;
    } catch (error) {
      console.error('❌ Error searching similar documents:', error);
      throw error;
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    try {
      // Delete from MongoDB
      const collection = mongodb.getCollection<IDocument>('documents');
      await collection.deleteOne({ _id: new ObjectId(documentId) });

      // Delete from Pinecone
      const index = await pinecone.getIndex();
      await index.deleteOne(documentId);

      console.log(`🗑️  Deleted document ${documentId} from both databases`);
    } catch (error) {
      console.error('❌ Error deleting document:', error);
      throw error;
    }
  }

  // Helper function to generate mock embeddings (replace with actual embedding service)
  generateMockEmbedding(text: string): number[] {
    // This is just a mock - in real applications, use services like:
    // - OpenAI Embeddings
    // - Cohere Embeddings  
    // - Sentence Transformers
    const embedding = new Array(1536).fill(0).map(() => Math.random() - 0.5);
    return embedding;
  }
}

export const vectorSearch = new VectorSearchExample();