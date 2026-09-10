const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres.mmcdlumxdrbvomtyiaer:Harsh@9506)!@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

const defaultHeroImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDhki3C6gDAjRNyDBV8U_XwUQ2ImFWQtx2MDVAV6-txhuaUJJusdbUKfIx4WqlqYFHUVOvPX_RewEzDEdfGBHF0Qd3ZR8nZvMPR2pMnxPXwUpfZ7QfPBArUJstd22K36Xh8-mx5KR9GiD5_JOIj46R5qaVqZ6WtF8u_OEvAqJcM1IpCy_2fsszkAgP65FGbLlVv1wxNFh_Vv5b8K_KoZ2szdmJtOCI4ommDZunH61nESrJ-BmwYnKHfQu0fqdHngk12xhYSf4_wXg';

client.connect()
  .then(async () => {
    const res = await client.query("SELECT * FROM cms_page WHERE page_key = 'about'");
    if (res.rows.length > 0) {
      let content = JSON.parse(res.rows[0].content_json);
      content.hero.image = defaultHeroImage;
      await client.query("UPDATE cms_page SET content_json = $1 WHERE page_key = 'about'", [JSON.stringify(content)]);
      console.log("Updated successfully");
    }
    client.end();
  })
  .catch(e => {
    console.error(e);
    client.end();
  });
