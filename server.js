require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');

console.log("Loaded GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "✅ Found" : "❌ Missing");

// Import services
const RAGPipeline = require('./services/ragPipeline');
const SessionManager = require('./services/memorySessionManager');

const app = express();
const server = http.createServer(app);

// Initialize services
const ragPipeline = new RAGPipeline();
const sessionManager = new SessionManager();

// ✅ CORS setup
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3003",
    "http://127.0.0.1:3003"
  ],
  credentials: true,
  methods: ["GET", "POST", "DELETE", "PUT"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ✅ Socket.io CORS
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:3003",
      "http://127.0.0.1:3003"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Debugging middleware
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path} from ${req.get('origin') || 'unknown'}`);
  next();
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Backend is reachable!', timestamp: new Date().toISOString() });
});

// Initialize RAG pipeline
let isRAGInitialized = false;
async function initializeRAG() {
  try {
    console.log('🚀 Initializing RAG pipeline...');
    await ragPipeline.initializeWithNewsData();
    isRAGInitialized = true;
    console.log('✅ RAG pipeline initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize RAG pipeline:', error.message);
  }
}
initializeRAG();

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'RAG Chatbot Backend is running!',
    ragInitialized: isRAGInitialized,
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', async (req, res) => {
  const ragHealth = await ragPipeline.healthCheck();
  const sessionHealth = await sessionManager.healthCheck();
  
  res.json({
    status: 'running',
    services: {
      rag: ragHealth,
      sessions: sessionHealth
    },
    timestamp: new Date().toISOString()
  });
});

// Create new session
app.post('/api/session/new', async (req, res) => {
  try {
    const sessionId = await sessionManager.createSession();
    res.json({ sessionId, message: 'Session created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get session history
app.get('/api/session/:sessionId/history', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = await sessionManager.getSessionHistory(sessionId);
    
    if (!history) return res.status(404).json({ error: 'Session not found' });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear session
app.delete('/api/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    await sessionManager.clearSession(sessionId);
    res.json({ message: 'Session cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.io handling
io.on('connection', (socket) => {
  console.log(`👤 New client connected: ${socket.id}`);

  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
    console.log(`📱 Client ${socket.id} joined session ${sessionId}`);
  });

  socket.on('send-message', async (data) => {
    const { sessionId, message } = data;

    io.to(sessionId).emit('bot-typing', true); // start typing

    try {
      if (!isRAGInitialized) {
        io.to(sessionId).emit('bot-response', {
          error: 'System is still initializing. Please try again in a moment.',
          loading: false
        });
        return;
      }

      const messageHash = crypto.createHash('md5').update(message.toLowerCase().trim()).digest('hex');
      const cachedResponse = await sessionManager.getCachedResponse(messageHash);
      
      let botResponse;
      let relevantArticles = [];
      
      if (cachedResponse) {
        console.log('📋 Using cached response');
        botResponse = cachedResponse;
      } else {
        console.log(`🔍 Processing new query: "${message}"`);
        const ragResult = await ragPipeline.processQuery(message);
        botResponse = ragResult.response;
        relevantArticles = ragResult.relevantArticles;
        await sessionManager.cacheResponse(messageHash, botResponse);
      }

      await sessionManager.addMessage(sessionId, message, botResponse);

      // ✅ Send response first
      io.to(sessionId).emit('bot-response', {
        message: botResponse,
        relevantArticles,
        timestamp: new Date().toISOString(),
        loading: false
      });

    } catch (error) {
      console.error('❌ Error processing message:', error.message);
      io.to(sessionId).emit('bot-response', {
        error: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date().toISOString(),
        loading: false
      });
    } finally {
      // ✅ Stop typing in all cases
      io.to(sessionId).emit('bot-typing', false);
    }
  });

  socket.on('disconnect', () => {
    console.log(`👋 Client disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io server ready`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down gracefully...');
  process.exit(0);
});
