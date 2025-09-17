const axios = require('axios');

class JinaEmbeddingsService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = 'https://api.jina.ai/v1/embeddings';
  }

  async createEmbeddings(texts) {
    try {
      // Jina API expects array of strings
      const response = await axios.post(this.apiUrl, {
        model: 'jina-embeddings-v2-base-en',
        input: Array.isArray(texts) ? texts : [texts]
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      // Extract embeddings from response
      const embeddings = response.data.data.map(item => item.embedding);
      return embeddings;
    } catch (error) {
      console.error('Error creating embeddings:', error.response?.data || error.message);
      throw error;
    }
  }

  // Process articles into embeddings
  async embedArticles(articles) {
    console.log('Creating embeddings for articles...');
    
    // Create text for embedding (title + content)
    const texts = articles.map(article => 
      `${article.title} ${article.content}`.substring(0, 8000) // Limit text length
    );

    // Create embeddings in batches to avoid API limits
    const batchSize = 10;
    let allEmbeddings = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(texts.length/batchSize)}`);
      
      const embeddings = await this.createEmbeddings(batch);
      allEmbeddings = allEmbeddings.concat(embeddings);
      
      // Wait between batches to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`Created ${allEmbeddings.length} embeddings`);
    return allEmbeddings;
  }
}

module.exports = JinaEmbeddingsService;
