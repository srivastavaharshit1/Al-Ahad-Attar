process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.mmcdlumxdrbvomtyiaer:Harsh%409506%29!@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  const res = await client.query(`
    SELECT p.id as p_id, p.name as p_name, pi.id as img_id, pi.image_url, pi.is_primary
    FROM product p
    LEFT JOIN product_image pi ON p.id = pi.product_id
    WHERE p.name ILIKE '%vishal%'
  `);
  console.log('Images for Vishal:', res.rows);
  
  const res2 = await client.query(`
    SELECT v.id as v_id, v.product_id, v.size, v.image
    FROM product_variant v
    JOIN product p ON p.id = v.product_id
    WHERE p.name ILIKE '%vishal%'
  `);
  console.log('Variants for Vishal:', res2.rows);

  client.end();
}
main().catch(console.error);
