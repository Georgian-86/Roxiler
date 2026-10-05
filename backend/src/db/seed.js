const bcrypt = require('bcryptjs');
const { pool } = require('./pool');
const migrate = require('./migrate');

const PASSWORD = 'Password@123';

const users = [
  { name: 'System Administrator Account', email: 'admin@roxiler.com', role: 'ADMIN', address: '1 Admin Plaza, Pune, Maharashtra' },
  { name: 'Priya Sharma Normal User One', email: 'user@roxiler.com', role: 'USER', address: '22 MG Road, Bengaluru, Karnataka' },
  { name: 'Rahul Verma Regular Customer', email: 'rahul@roxiler.com', role: 'USER', address: '5 Park Street, Kolkata, West Bengal' },
  { name: 'Anita Desai Store Owner Account', email: 'owner@roxiler.com', role: 'OWNER', address: '10 Linking Road, Mumbai, Maharashtra' },
  { name: 'Vikram Singh Second Store Owner', email: 'owner2@roxiler.com', role: 'OWNER', address: '8 Connaught Place, New Delhi' },
];

const stores = [
  { name: 'Sunrise Organic Grocery Market', email: 'sunrise@stores.com', address: '10 Linking Road, Bandra West, Mumbai', owner: 'owner@roxiler.com' },
  { name: 'Metro Electronics Superstore', email: 'metro@stores.com', address: '8 Connaught Place, New Delhi', owner: 'owner2@roxiler.com' },
  { name: 'Riverside Books and Coffee House', email: 'riverside@stores.com', address: '14 FC Road, Shivajinagar, Pune', owner: null },
];

async function seed() {
  await migrate();
  const hash = await bcrypt.hash(PASSWORD, 10);
  const ids = {};
  for (const u of users) {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, address, role) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [u.name, u.email, hash, u.address, u.role]
    );
    ids[u.email] = rows[0].id;
  }
  const storeIds = [];
  for (const s of stores) {
    const { rows } = await pool.query(
      `INSERT INTO stores (name, email, address, owner_id) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [s.name, s.email, s.address, s.owner ? ids[s.owner] : null]
    );
    storeIds.push(rows[0].id);
  }
  const ratings = [
    ['user@roxiler.com', 0, 5], ['user@roxiler.com', 1, 3],
    ['rahul@roxiler.com', 0, 4], ['rahul@roxiler.com', 2, 2],
  ];
  for (const [email, idx, rating] of ratings) {
    await pool.query(
      `INSERT INTO ratings (user_id, store_id, rating) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, store_id) DO UPDATE SET rating = EXCLUDED.rating`,
      [ids[email], storeIds[idx], rating]
    );
  }
  console.log(`Seeded. All demo accounts use password: ${PASSWORD}`);
}

seed()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
