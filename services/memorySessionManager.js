const { v4: uuidv4 } = require('uuid');

class MemorySessionManager {
  constructor() {
    this.sessions = new Map();
    this.cache = new Map();
    console.log('📝 Using memory-based session management (Redis fallback)');
  }

  async createSession() {
    const sessionId = uuidv4();
    const sessionData = {
      sessionId,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      messages: []
    };
    this.sessions.set(sessionId, sessionData);
    console.log(`📱 Created new session: ${sessionId}`);
    return sessionId;
  }

  async addMessage(sessionId, userMessage, botResponse) {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      throw new Error('Session not found');
    }

    const messageEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      userMessage,
      botResponse
    };

    sessionData.messages.push(messageEntry);
    sessionData.lastActivity = new Date().toISOString();
    this.sessions.set(sessionId, sessionData);

    console.log(`💬 Added message to session ${sessionId}`);
    return messageEntry.id;
  }

  async getSessionHistory(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  async clearSession(sessionId) {
    const deleted = this.sessions.delete(sessionId);
    console.log(`🗑 Cleared session ${sessionId}: ${deleted}`);
    return deleted;
  }

  async getActiveSessions() {
    return Array.from(this.sessions.values()).map(session => ({
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      messageCount: session.messages.length
    }));
  }

  async cacheResponse(queryHash, response) {
    this.cache.set(queryHash, { 
      response, 
      timestamp: Date.now() 
    });
  }

  async getCachedResponse(queryHash) {
    const cached = this.cache.get(queryHash);
    if (cached && Date.now() - cached.timestamp < 1800000) { // 30 min
      return cached.response;
    }
    return null;
  }

  async healthCheck() {
    return { 
      status: 'healthy',
      type: 'memory-storage',
      sessions: this.sessions.size,
      cacheSize: this.cache.size,
      timestamp: new Date().toISOString() 
    };
  }
}

module.exports = MemorySessionManager;
