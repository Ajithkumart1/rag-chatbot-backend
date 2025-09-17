const axios = require('axios');
const cheerio = require('cheerio');

class NewsScraper {
  constructor() {
    this.articles = [];
  }

  // Simple RSS feed scraper
  async scrapeFromRSS(rssUrl) {
    try {
      const response = await axios.get(rssUrl);
      const $ = cheerio.load(response.data, { xmlMode: true });
      
      const articles = [];
      $('item').each((index, element) => {
        if (index < 20) { // Limit to 20 articles per RSS
          const title = $(element).find('title').text();
          const description = $(element).find('description').text();
          const link = $(element).find('link').text();
          const pubDate = $(element).find('pubDate').text();
          
          articles.push({
            title: title.trim(),
            content: description.trim(),
            url: link.trim(),
            publishedAt: pubDate,
            source: 'RSS'
          });
        }
      });
      
      return articles;
    } catch (error) {
      console.error('Error scraping RSS:', error.message);
      return [];
    }
  }

  // Scrape multiple sources
  async scrapeMultipleSources() {
    const rssSources = [
      'http://feeds.bbci.co.uk/news/rss.xml',
      'https://feeds.reuters.com/reuters/topNews',
      'https://rss.cnn.com/rss/edition.rss',
      'https://feeds.npr.org/1001/rss.xml'
    ];

    let allArticles = [];
    
    for (const rssUrl of rssSources) {
      console.log(`Scraping ${rssUrl}...`);
      const articles = await this.scrapeFromRSS(rssUrl);
      allArticles = allArticles.concat(articles);
      
      // Wait 1 second between requests to be polite
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Take first 50 articles
    this.articles = allArticles.slice(0, 50);
    console.log(`Scraped ${this.articles.length} articles`);
    return this.articles;
  }

  // Get articles
  getArticles() {
    return this.articles;
  }
}

module.exports = NewsScraper;
