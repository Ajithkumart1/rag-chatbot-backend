const express = require('express');
const crypto = require('crypto');
const RAGPipeline = require('./services/ragPipeline');
const SessionManager = require('./services/sessionManager');

const router = express.Router();

// Initialize services
const ragPipeline = new RAGPipeline();
const sessionManager = new SessionManager();
let isRAGInitialized = false;

// Initialize RAG pipeline on startup
(async () => {
  try {
    console.log('🚀 Initializing RAG pipeline...');
    await ragPipeline.initializeWithNewsData();
    isRAGInitialized = true;
    console.log('✅ RAG pipeline initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize RAG pipeline:', error.message);
  }
})();

// Chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'sessionId and message are required' });
    }

    // Check if RAG pipeline is ready
    if (!isRAGInitialized) {
      return res.status(503).json({ error: 'System is initializing. Please try again later.' });
    }

    // Check cache first
    const messageHash = crypto.createHash('md5').update(message.toLowerCase().trim()).digest('hex');
    let botResponse = await sessionManager.getCachedResponse(messageHash);
    let relevantArticles = [];

    if (!botResponse) {
      // Process with RAG pipeline
      const result = await ragPipeline.processQuery(message);
      botResponse = result.response;
      relevantArticles = result.relevantArticles;

      // Cache the response
      await sessionManager.cacheResponse(messageHash, botResponse);
    }

    // Save to session history
    await sessionManager.addMessage(sessionId, message, botResponse);

    res.json({
      message: botResponse,
      relevantArticles,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in /chat endpoint:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
