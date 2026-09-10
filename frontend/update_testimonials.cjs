const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres.mmcdlumxdrbvomtyiaer:Harsh@9506)!@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(async () => {
    // Update ID 1 - Fatima R. - Turkish Oud
    await client.query(`UPDATE testimonial SET review = 'The Turkish Oud is absolutely breathtaking. It has a rich, smoky depth that feels incredibly luxurious, and it stays with me the entire day.' WHERE id = 1`);
    
    // Update ID 2 - Arjun M. - Black Jaguar
    await client.query(`UPDATE testimonial SET review = 'I wore Black Jaguar to a recent evening event and it was a total hit. The scent is bold yet refined, easily rivaling much more expensive brands.' WHERE id = 2`);
    
    // Update ID 3 - Sana K. - Majmua
    await client.query(`UPDATE testimonial SET review = 'Majmua has a wonderfully traditional yet fresh aroma. It feels very calming when I wear it, and the quality is truly exceptional.' WHERE id = 3`);
    
    // Delete others to keep only 3 testimonials
    await client.query(`DELETE FROM testimonial WHERE id NOT IN (1, 2, 3)`);
    
    console.log("Testimonials updated successfully.");
    client.end();
  })
  .catch(e => {
    console.error(e);
    client.end();
  });
