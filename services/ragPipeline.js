// services/ragPipeline.js
const JinaEmbeddingsService = require("./jinaEmbeddings");
const QdrantService = require("./qdrantService");
const GeminiService = require("./geminiService");
const NewsScraper = require("./newsScraper");

class RAGPipeline {
  constructor() {
    // Initialize services
    this.jinaService = new JinaEmbeddingsService(process.env.JINA_API_KEY);
    this.qdrantService = new QdrantService(); // ✅ Reads from .env automatically
    this.geminiService = new GeminiService(); // ✅ No need to pass API key
    this.newsScraper = new NewsScraper();

    this.isInitialized = false;
  }

  // Step 1: Initialize and ingest news data
  async initializeWithNewsData() {
    try {
      console.log("🚀 Starting RAG pipeline initialization...");

      // 1. Scrape news articles
      console.log("📰 Scraping news articles...");
      const articles = await this.newsScraper.scrapeMultipleSources();

      if (articles.length === 0) {
        throw new Error("No articles scraped. Check your internet connection.");
      }

      // 2. Create embeddings
      console.log("🔤 Creating embeddings...");
      const embeddings = await this.jinaService.embedArticles(articles);

      // 3. Initialize Qdrant collection
      console.log("🗃 Setting up vector database...");
      await this.qdrantService.initializeCollection();

      // 4. Store articles and embeddings
      console.log("💾 Storing articles in vector database...");
      await this.qdrantService.addDocuments(articles, embeddings);

      // 5. Verify setup
      const collectionInfo = await this.qdrantService.getCollectionInfo();
      console.log(`✅ Successfully initialized with ${collectionInfo.points_count} articles`);

      this.isInitialized = true;
      return { success: true, articlesCount: articles.length };
    } catch (error) {
      console.error("❌ Error initializing RAG pipeline:", error.message);
      throw error;
    }
  }

  // Step 2: Process user query
  async processQuery(userQuery) {
    if (!this.isInitialized) {
      throw new Error("RAG pipeline not initialized. Call initializeWithNewsData() first.");
    }

    try {
      console.log(`🔍 Processing query: "${userQuery}"`);

      // 1. Create embedding for user query
      const queryEmbeddings = await this.jinaService.createEmbeddings([userQuery]);
      const queryVector = queryEmbeddings[0];

      // 2. Search for relevant articles
      const relevantArticles = await this.qdrantService.searchSimilar(queryVector, 5);
      console.log(`📋 Found ${relevantArticles.length} relevant articles`);

      // 2a. Remove duplicate articles based on title
      const uniqueArticles = [];
      const seenTitles = new Set();
      for (const article of relevantArticles) {
        if (!seenTitles.has(article.payload.title)) {
          seenTitles.add(article.payload.title);
          uniqueArticles.push(article);
        }
      }

      // 3. Generate response using Gemini
      const response = await this.geminiService.generateResponse(userQuery, uniqueArticles);

      return {
        query: userQuery,
        response: response,
        relevantArticles: uniqueArticles.map(article => ({
          title: article.payload.title,
          url: article.payload.url,
          score: article.score,
        })),
      };
    } catch (error) {
      console.error("❌ Error processing query:", error.message);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const collectionInfo = await this.qdrantService.getCollectionInfo();
      return {
        status: "healthy",
        articlesCount: collectionInfo.points_count,
        isInitialized: this.isInitialized,
      };
    } catch (error) {
      return {
        status: "error",
        error: error.message,
        isInitialized: this.isInitialized,
      };
    }
  }
}

module.exports = RAGPipeline;
