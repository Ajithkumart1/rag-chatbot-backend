const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

class SessionManager {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3,
    });

    // TTL settings (in seconds)
    this.sessionTTL = 3600; // 1 hour
    this.messageTTL = 86400; // 24 hours

    this.redis.on('connect', () => console.log('✅ Connected to Redis'));
    this.redis.on('error', (err) => console.error('❌ Redis error:', err.message));
  }

  // Create new session
  async createSession() {
    const sessionId = uuidv4();
    const sessionData = {
      sessionId,
      createdAt: new Date().toISOString(),
      messages: []
    };

    await this.redis.setex(
      `session:${sessionId}`, 
      this.sessionTTL, 
      JSON.stringify(sessionData)
    );

    console.log(`📱 Created new session: ${sessionId}`);
    return sessionId;
  }

  // Add message to session
  async addMessage(sessionId, userMessage, botResponse) {
    try {
      const sessionKey = `session:${sessionId}`;
      const sessionDataStr = await this.redis.get(sessionKey);

      if (!sessionDataStr) {
        throw new Error('Session not found');
      }

      const sessionData = JSON.parse(sessionDataStr);

      // Add new message pair
      const messageEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        userMessage,
        botResponse
      };

      sessionData.messages.push(messageEntry);
      sessionData.lastActivity = new Date().toISOString();

      // Update session with extended TTL
      await this.redis.setex(
        sessionKey, 
        this.sessionTTL, 
        JSON.stringify(sessionData)
      );

      console.log(`💬 Added message to session ${sessionId}`);
      return messageEntry.id;
    } catch (error) {
      console.error('Error adding message:', error.message);
      throw error;
    }
  }

  // Get session history
  async getSessionHistory(sessionId) {
    try {
      const sessionKey = `session:${sessionId}`;
      const sessionDataStr = await this.redis.get(sessionKey);

      if (!sessionDataStr) {
        return null;
      }

      const sessionData = JSON.parse(sessionDataStr);
      return sessionData;
    } catch (error) {
      console.error('Error getting session history:', error.message);
      throw error;
    }
  }

  // Clear session
  async clearSession(sessionId) {
    try {
      const sessionKey = `session:${sessionId}`;
      await this.redis.del(sessionKey);
      console.log(`🗑 Cleared session ${sessionId}`);
      return true;
    } catch (error) {
      console.error('Error clearing session:', error.message);
      throw error;
    }
  }

  // Get all active sessions (for admin purposes)
  async getActiveSessions() {
    try {
      const keys = await this.redis.keys('session:*');
      const sessions = [];

      for (const key of keys) {
        const sessionDataStr = await this.redis.get(key);
        if (sessionDataStr) {
          const sessionData = JSON.parse(sessionDataStr);
          sessions.push({
            sessionId: sessionData.sessionId,
            createdAt: sessionData.createdAt,
            lastActivity: sessionData.lastActivity,
            messageCount: sessionData.messages.length
          });
        }
      }

      return sessions;
    } catch (error) {
      console.error('Error getting active sessions:', error.message);
      throw error;
    }
  }

  // Cache frequently asked questions responses
  async cacheResponse(queryHash, response) {
    const cacheKey = `cache:response:${queryHash}`;
    await this.redis.setex(cacheKey, 1800, response); // 30 minutes cache
  }

  async getCachedResponse(queryHash) {
    const cacheKey = `cache:response:${queryHash}`;
    return await this.redis.get(cacheKey);
  }

  // Health check
  async healthCheck() {
    try {
      await this.redis.ping();
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }
}

module.exports = SessionManager;
