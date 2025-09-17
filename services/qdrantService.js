const { QdrantClient } = require('@qdrant/js-client-rest');
const { v4: uuidv4 } = require('uuid');

class QdrantService {
  constructor() {
    // Prefer QDRANT_URL for cloud, otherwise fallback to host + port
    if (process.env.QDRANT_URL) {
      this.client = new QdrantClient({
        url: process.env.QDRANT_URL, // e.g. https://xxxxx.cloud.qdrant.io
        apiKey: process.env.QDRANT_API_KEY || undefined
      });
    } else {
      this.client = new QdrantClient({
        host: process.env.QDRANT_HOST || 'localhost',
        port: process.env.QDRANT_PORT ? Number(process.env.QDRANT_PORT) : 6333,
        apiKey: process.env.QDRANT_API_KEY || undefined
      });
    }

    this.collectionName = 'news_articles';
  }

  // ✅ Safe collection creation (no "Conflict" error)
  async initializeCollection() {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        c => c.name === this.collectionName
      );

      if (!exists) {
        await this.client.createCollection(this.collectionName, {
          vectors: { size: 768, distance: 'Cosine' }
        });
        console.log(`✅ Created collection '${this.collectionName}'`);
      } else {
        console.log(`✅ Collection '${this.collectionName}' already exists, skipping creation`);
      }
    } catch (error) {
      console.error('❌ Error initializing collection:', error.message);
      throw error;
    }
  }

  // ✅ Store docs with unique IDs (no overwrite)
  async addDocuments(articles, embeddings) {
    try {
      const points = articles.map((article, index) => ({
        id: uuidv4(), // unique each time
        vector: embeddings[index],
        payload: {
          title: article.title,
          content: article.content,
          url: article.url,
          publishedAt: article.publishedAt,
          source: article.source
        }
      }));

      await this.client.upsert(this.collectionName, { points });
      console.log(`✅ Added ${points.length} articles to Qdrant`);
    } catch (error) {
      console.error('❌ Error adding documents:', error.message);
      throw error;
    }
  }

  async searchSimilar(vector, limit = 5) {
    try {
      const results = await this.client.search(this.collectionName, {
        vector,
        limit,
        with_payload: true
      });
      return results;
    } catch (error) {
      console.error('❌ Error searching Qdrant:', error.message);
      throw error;
    }
  }

  async getCollectionInfo() {
    try {
      return await this.client.getCollection(this.collectionName);
    } catch (error) {
      console.error('❌ Error fetching collection info:', error.message);
      throw error;
    }
  }
}

module.exports = QdrantService;
