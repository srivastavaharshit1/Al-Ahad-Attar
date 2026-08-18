process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.mmcdlumxdrbvomtyiaer:Harsh%409506%29!@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();

  // Find products with multiple primary images
  const res = await client.query(`
    SELECT product_id, COUNT(id) as count
    FROM product_image
    WHERE is_primary = true AND active = true
    GROUP BY product_id
    HAVING COUNT(id) > 1
  `);
  
  for (const row of res.rows) {
    const productId = row.product_id;
    console.log(`Product ${productId} has multiple primary images.`);
    
    // Get all primary images for this product ordered by id desc (keep latest)
    const imagesRes = await client.query(`
      SELECT id FROM product_image
      WHERE product_id = $1 AND is_primary = true AND active = true
      ORDER BY id DESC
    `, [productId]);
    
    const images = imagesRes.rows;
    const keepId = images[0].id;
    
    for (let i = 1; i < images.length; i++) {
      const dropId = images[i].id;
      console.log(`Setting is_primary = false for image ${dropId}`);
      await client.query(`
        UPDATE product_image SET is_primary = false WHERE id = $1
      `, [dropId]);
    }
  }

  console.log('Fixed duplicate primary images.');
  client.end();
}
main().catch(console.error);
