/** Free public RSS feeds for world news — no auth required */
export const RSS_FEEDS = [
  { name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { name: "Reuters World", url: "https://www.reutersagency.com/feed/?taxonomy=best-sectors&post_type=best" },
  { name: "AP News", url: "https://rsshub.app/apnews/topics/apf-topnews" },
  { name: "NPR News", url: "https://feeds.npr.org/1001/rss.xml" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { name: "The Guardian World", url: "https://www.theguardian.com/world/rss" },
  { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index" },
  { name: "Hacker News", url: "https://hnrss.org/newest?points=50" },
] as const;
