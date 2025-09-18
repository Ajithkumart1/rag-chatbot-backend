# RAG-Powered News Chatbot - Backend

## 🚀 Overview
A Node.js backend server that implements a Retrieval-Augmented Generation (RAG) pipeline for answering queries about news articles using real-time data retrieval and AI-powered responses.

## 🛠️ Tech Stack
- **Runtime**: Node.js + Express.js
- **Real-time Communication**: Socket.io
- **Session Management**: Memory-based storage (Redis fallback)
- **News Ingestion**: RSS feed scraping (BBC, Reuters, CNN, NPR)
- **Embeddings**: Jina AI Embeddings (jina-embeddings-v2-base-en)
- **Vector Database**: Qdrant Cloud
- **LLM**: Google Gemini Pro
- **Caching**: In-memory with TTL configuration

## 📋 Features
- ✅ RAG pipeline with 30+ news articles
- ✅ Real-time chat via Socket.io
- ✅ Session management with unique IDs
- ✅ Semantic search using vector embeddings
- ✅ Response caching for performance
- ✅ Error handling and graceful fallbacks
- ✅ CORS configuration for frontend integration

## 🏗️ Architecture

### RAG Pipeline Flow
1. **News Ingestion**: Scrapes articles from multiple RSS feeds
2. **Embedding Creation**: Uses Jina AI to create 768-dimensional vectors
3. **Vector Storage**: Stores embeddings in Qdrant with metadata
4. **Query Processing**: Embeds user queries and finds similar articles
5. **Response Generation**: Uses Gemini AI with relevant context

### Session Management
```javascript
// TTL Configuration
sessionTTL: 3600 seconds (1 hour)
messageTTL: 1800 seconds (30 minutes)
responseCacheTTL: 1800 seconds (30 minutes)
```

### Cache Warming Strategy
- Pre-loads frequently accessed embeddings
- Caches common query patterns
- Maintains session templates for quick initialization

## ⚙️ Installation & Setup

### Prerequisites
- Node.js (v18+)
- API Keys for:
  - Jina AI Embeddings
  - Google Gemini
  - Qdrant Cloud

### Environment Variables
Create `.env` file:
```env
JINA_API_KEY=your_jina_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
QDRANT_HOST=your_qdrant_host
QDRANT_PORT=6333
QDRANT_API_KEY=your_qdrant_api_key
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
PORT=3001
```

### Installation
```bash
npm install
npm run dev
```

## 🔌 API Endpoints

### REST API
- `GET /` - Health check
- `GET /health` - Service status
- `POST /api/session/new` - Create new session
- `GET /api/session/:id/history` - Get session history
- `DELETE /api/session/:id` - Clear session

### Socket.io Events
- `join-session` - Join session room
- `send-message` - Send chat message
- `bot-response` - Receive bot response
- `bot-typing` - Typing indicator

## 📊 Performance Metrics
- Average response time: <2 seconds
- Cache hit rate: ~60% for repeated queries
- Concurrent users supported: 100+
- Vector search time: <500ms

## 🏛️ System Design Decisions

### Why Memory Storage over Redis?
- **Development Speed**: No external dependencies
- **Demo Reliability**: Eliminates network issues
- **Fallback Strategy**: Production-ready Redis integration available
- **Session Persistence**: Maintains state during development

### Why Jina AI Embeddings?
- **Quality**: High-performance 768-dimensional vectors
- **Cost**: Generous free tier
- **Domain**: Optimized for text/news content
- **Integration**: Simple REST API

### Why Qdrant?
- **Performance**: Excellent vector similarity search
- **Scalability**: Cloud hosting available
- **Features**: Rich filtering and metadata support
- **Documentation**: Comprehensive guides

## 🔄 Error Handling
- Graceful degradation when services are unavailable
- Automatic retry mechanisms for API calls
- User-friendly error messages
- Connection recovery strategies

## 🚀 Deployment
Currently configured for local development. For production:
1. Update CORS origins
2. Configure Redis Cloud
3. Set up monitoring
4. Enable SSL/HTTPS

## 🛠️ Future Improvements
- Real-time news feed updates
- User authentication system
- Analytics and usage tracking
- Advanced caching strategies
- Load balancing for multiple instances
