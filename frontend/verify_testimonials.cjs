const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres.mmcdlumxdrbvomtyiaer:Harsh@9506)!@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(async () => {
    const testRes = await client.query('SELECT id, customer_name, review FROM testimonial');
    console.log(JSON.stringify(testRes.rows, null, 2));
    client.end();
  })
  .catch(e => {
    console.error(e);
    client.end();
  });
