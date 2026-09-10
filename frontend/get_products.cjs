const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres.mmcdlumxdrbvomtyiaer:Harsh@9506)!@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => client.query('SELECT name FROM products WHERE is_active = true'))
  .then(res => {
    console.log(res.rows.map(r => r.name).join(', '));
    client.end();
  })
  .catch(e => {
    console.error(e);
    client.end();
  });
