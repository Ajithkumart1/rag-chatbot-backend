const RAGPipeline = require('./services/ragPipeline');
require('dotenv').config();

async function testRAGPipeline() {
  const ragPipeline = new RAGPipeline();
  
  try {
    // Initialize
    console.log('Initializing RAG pipeline...');
    await ragPipeline.initializeWithNewsData();
    
    // Test query
    console.log('\nTesting query...');
    const result = await ragPipeline.processQuery('What are the latest news about technology?');
    
    console.log('\n📝 Response:');
    console.log(result.response);
    
    console.log('\n📚 Relevant articles:');
    result.relevantArticles.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title} (Score: ${article.score.toFixed(3)})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Only run if called directly
if (require.main === module) {
  testRAGPipeline();
}
