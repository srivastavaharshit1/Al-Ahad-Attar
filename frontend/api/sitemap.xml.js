export default async function handler(req, res) {
  const apiUrl = process.env.VITE_API_URL || 'http://localhost:8080/api';
  
  try {
    const response = await fetch(`${apiUrl}/sitemap.xml`);
    
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }
    
    const xml = await response.text();
    
    res.setHeader('Content-Type', 'text/xml');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).send(xml);
  } catch (error) {
    console.error('Error fetching sitemap from backend:', error);
    // Provide a fallback basic sitemap if the backend is down
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://alahadattars.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(fallbackXml);
  }
}
