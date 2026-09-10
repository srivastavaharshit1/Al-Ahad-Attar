const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres.mmcdlumxdrbvomtyiaer:Harsh@9506)!@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(async () => {
    console.log("=== PRODUCTS ===");
    const productsRes = await client.query('SELECT id, name FROM product WHERE active = true OR active IS NULL');
    console.log(JSON.stringify(productsRes.rows, null, 2));

    console.log("\n=== TESTIMONIALS ===");
    const testRes = await client.query('SELECT * FROM testimonial');
    console.log(JSON.stringify(testRes.rows, null, 2));

    client.end();
  })
  .catch(e => {
    console.error(e);
    client.end();
  });
