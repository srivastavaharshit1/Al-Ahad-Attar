const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.mmcdlumxdrbvomtyiaer:Harsh%409506%29!@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres'
});
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
client.connect()
  .then(() => client.query(`
    INSERT INTO homepage_section (section_key, title, subtitle, description, display_order, visible, created_at, updated_at) 
    VALUES ('brand_story', 'The Art of Fine Perfumery', 'OUR HERITAGE', 'Born from a passion for the rarest ingredients and the most exquisite olfactory experiences, Al Ahad Attars represents the pinnacle of luxury Arabic perfumery. Every drop is a testament to generations of masterful craftsmanship, blending rich oud, pure musk, and delicate floral essences into timeless signatures that linger long after you leave the room.', 8, true, NOW(), NOW())
  `))
  .then(res => { console.log('Inserted brand_story successfully'); client.end(); })
  .catch(err => { console.error(err); client.end(); });
