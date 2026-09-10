const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres.mmcdlumxdrbvomtyiaer:Harsh@9506)!@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => client.query('SELECT * FROM homepage_testimonials'))
  .then(res => {
    console.log(JSON.stringify(res.rows, null, 2));
    client.end();
  })
  .catch(e => {
    console.error('Error fetching from homepage_testimonials:', e.message);
    // Let's try just testimonials if homepage_testimonials fails
    client.query('SELECT * FROM testimonials')
      .then(res2 => {
        console.log(JSON.stringify(res2.rows, null, 2));
        client.end();
      })
      .catch(e2 => {
        console.error('Error fetching from testimonials:', e2.message);
        client.end();
      });
  });
