const NewsScraper = require('./services/newsScraper');

async function testScraper() {
  const scraper = new NewsScraper();
  const articles = await scraper.scrapeMultipleSources();
  
  console.log('First article:');
  console.log(articles[0]);
  console.log(`\nTotal articles: ${articles.length}`);
}

testScraper();
