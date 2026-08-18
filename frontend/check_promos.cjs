const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgres://postgres.mmcdlumxdrbvomtyiaer:Harsh@9506)!@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});
client.connect()
  .then(() => client.query('SELECT * FROM promotion'))
  .then(res => { console.log(JSON.stringify(res.rows, null, 2)); client.end(); })
  .catch(err => { console.error(err); client.end(); });
