// services/geminiService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

class GeminiService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("❌ GEMINI_API_KEY is missing. Please check your .env file.");
    }

    // Initialize Gemini with API Key
    this.genAI = new GoogleGenerativeAI(apiKey);

    // Use Gemini model (flash is free-tier friendly)
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });
  }

  // Generate normal (non-streaming) response
  async generateResponse(query, relevantArticles) {
    try {
      // Keep only top 3-4 unique articles to reduce repetition
      const uniqueArticles = Array.from(
        new Map(relevantArticles.map(a => [a.payload.title, a])).values()
      ).slice(0, 4);

      const context = uniqueArticles.map((article, i) =>
        `Article ${i + 1}:\nTitle: ${article.payload.title}\nContent: ${article.payload.content}\nSource: ${article.payload.source}`
      ).join("\n\n");

      const prompt = `You are a professional news assistant. 
Based only on the following news articles, provide a clear and concise answer to the user's question. 
Use complete sentences. If the articles do not contain enough information, say "I cannot find an answer in the provided articles."

Articles:
${context}

Question:
${query}

Answer:`;

      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("❌ Error generating response:", error.message);
      throw error;
    }
  }

  // Generate streaming response
  async generateStreamingResponse(query, relevantArticles) {
    try {
      const uniqueArticles = Array.from(
        new Map(relevantArticles.map(a => [a.payload.title, a])).values()
      ).slice(0, 4);

      const context = uniqueArticles.map((article, i) =>
        `Article ${i + 1}: ${article.payload.title} - ${article.payload.content}`
      ).join("\n");

      const prompt = `You are a professional news assistant. 
Based only on the following news articles, provide a clear and concise answer to the user's question. 
If the articles do not contain enough information, say "I cannot find an answer in the provided articles."

Context:
${context}

Question:
${query}

Answer:`;

      const stream = await this.model.generateContentStream(prompt);
      return stream; // iterate with for-await-of in server.js
    } catch (error) {
      console.error("❌ Error generating streaming response:", error.message);
      throw error;
    }
  }
}

module.exports = GeminiService;
