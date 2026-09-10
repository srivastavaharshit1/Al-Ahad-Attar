const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres.mmcdlumxdrbvomtyiaer:Harsh@9506)!@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(async () => {
    // Insert ID 4 - Rahul V. - White Oud
    await client.query(`INSERT INTO testimonial (id, customer_name, review, rating, active, display_order, created_at, updated_at) 
                        VALUES (4, 'Rahul V.', 'The White Oud is an absolute masterpiece. It is subtle yet incredibly elegant, perfect for daily wear. I have received so many questions about what I am wearing!', 5, true, 3, NOW(), NOW())
                        ON CONFLICT (id) DO UPDATE SET review = EXCLUDED.review, customer_name = EXCLUDED.customer_name`);

    // Insert ID 5 - Zara A. - Ameer Al Oud
    await client.query(`INSERT INTO testimonial (id, customer_name, review, rating, active, display_order, created_at, updated_at) 
                        VALUES (5, 'Zara A.', 'Ameer Al Oud has a magnificent, long-lasting scent that feels truly premium. It beautifully captures the essence of traditional attars with a modern touch.', 5, true, 4, NOW(), NOW())
                        ON CONFLICT (id) DO UPDATE SET review = EXCLUDED.review, customer_name = EXCLUDED.customer_name`);

    // Insert ID 6 - Vikram S. - Jannatul Firdaus
    await client.query(`INSERT INTO testimonial (id, customer_name, review, rating, active, display_order, created_at, updated_at) 
                        VALUES (6, 'Vikram S.', 'I have tried many versions of Jannatul Firdaus over the years, but this one is by far the most authentic and refreshing. Highly recommended!', 4, true, 5, NOW(), NOW())
                        ON CONFLICT (id) DO UPDATE SET review = EXCLUDED.review, customer_name = EXCLUDED.customer_name`);

    console.log("3 more testimonials added successfully.");
    client.end();
  })
  .catch(e => {
    console.error(e);
    client.end();
  });
