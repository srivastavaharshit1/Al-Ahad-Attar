const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres.mmcdlumxdrbvomtyiaer:Harsh@9506)!@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(async () => {
    const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'cms_page'");
    console.log("Columns:", res.rows.map(r => r.column_name).join(", "));
    client.end();
  })
  .catch(e => {
    console.error(e);
    client.end();
  });
