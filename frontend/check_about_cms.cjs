const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres.mmcdlumxdrbvomtyiaer:Harsh@9506)!@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(async () => {
    const res = await client.query("SELECT * FROM cms_page");
    if (res.rows.length > 0) {
      console.log(JSON.stringify(JSON.parse(res.rows[0].content_json), null, 2));
    } else {
      console.log("No about page found in CMS");
    }
    client.end();
  })
  .catch(e => {
    console.error(e);
    client.end();
  });
