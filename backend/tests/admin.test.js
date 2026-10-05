const { app, pool, request, resetDb, createUserAndLogin } = require('./helpers');

let admin;
const auth = () => ({ Authorization: `Bearer ${admin.token}` });

beforeEach(async () => {
  await resetDb();
  admin = await createUserAndLogin({ role: 'ADMIN', name: 'Main System Administrator' });
});
afterAll(() => pool.end());

const newUser = (o = {}) => ({
  name: 'Created By Admin Account User',
  email: 'created@test.com',
  address: '1 Created Lane',
  password: 'Create@123',
  role: 'USER',
  ...o,
});
const newStore = (o = {}) => ({ name: 'Fresh Mart Grocery Superstore', email: 'fresh@store.com', address: '9 Market Road', ...o });

describe('admin access control', () => {
  it.each(['USER', 'OWNER'])('forbids %s', async (role) => {
    const { token } = await createUserAndLogin({ role });
    const res = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe('admin users', () => {
  it('creates users of every role', async () => {
    for (const role of ['USER', 'ADMIN', 'OWNER']) {
      const res = await request(app).post('/api/admin/users').set(auth()).send(newUser({ role, email: `${role}@x.com` }));
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe(role);
    }
  });

  it('validates fields and role', async () => {
    const res = await request(app).post('/api/admin/users').set(auth()).send(newUser({ role: 'SUPER', name: 'short' }));
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.errors)).toEqual(expect.arrayContaining(['role', 'name']));
  });

  it('returns 409 on duplicate email', async () => {
    await request(app).post('/api/admin/users').set(auth()).send(newUser());
    const res = await request(app).post('/api/admin/users').set(auth()).send(newUser());
    expect(res.status).toBe(409);
  });

  it('filters, sorts and paginates users', async () => {
    await request(app).post('/api/admin/users').set(auth()).send(newUser({ name: 'Zachary Owner Of Many Shops', email: 'z@x.com', role: 'OWNER', address: 'Pune' }));
    await request(app).post('/api/admin/users').set(auth()).send(newUser({ name: 'Aaron Regular Shopper Person', email: 'a@x.com', address: 'Mumbai' }));

    let res = await request(app).get('/api/admin/users?role=OWNER').set(auth());
    expect(res.body.data.map((u) => u.email)).toEqual(['z@x.com']);

    res = await request(app).get('/api/admin/users?address=mum').set(auth());
    expect(res.body.data.map((u) => u.email)).toEqual(['a@x.com']);

    res = await request(app).get('/api/admin/users?sortBy=name&order=desc').set(auth());
    expect(res.body.data[0].name).toMatch(/^Zachary/);
    expect(res.body.meta.total).toBe(3);

    res = await request(app).get('/api/admin/users?limit=1&page=2&sortBy=name').set(auth());
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.totalPages).toBe(3);
  });

  it('treats LIKE wildcards in filters literally', async () => {
    const res = await request(app).get('/api/admin/users?name=%25').set(auth());
    expect(res.body.data).toHaveLength(0);
  });

  it('rejects unknown sort keys', async () => {
    const res = await request(app).get('/api/admin/users?sortBy=password_hash').set(auth());
    expect(res.status).toBe(400);
  });

  it('shows store owner rating in user details', async () => {
    const owner = await createUserAndLogin({ role: 'OWNER' });
    const store = await request(app).post('/api/admin/stores').set(auth()).send(newStore({ ownerId: owner.user.id }));
    const rater = await createUserAndLogin();
    await request(app).put(`/api/stores/${store.body.store.id}/rating`).set('Authorization', `Bearer ${rater.token}`).send({ rating: 4 });

    const res = await request(app).get(`/api/admin/users/${owner.user.id}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ role: 'OWNER', rating: 4, store: { id: store.body.store.id } });

    const plain = await request(app).get(`/api/admin/users/${rater.user.id}`).set(auth());
    expect(plain.body.user.rating).toBeNull();
    expect(plain.body.user.store).toBeUndefined();
  });

  it('404s for unknown users', async () => {
    expect((await request(app).get('/api/admin/users/9999').set(auth())).status).toBe(404);
  });
});

describe('admin stores', () => {
  it('creates a store with an owner and lists it with rating', async () => {
    const owner = await createUserAndLogin({ role: 'OWNER' });
    const created = await request(app).post('/api/admin/stores').set(auth()).send(newStore({ ownerId: owner.user.id }));
    expect(created.status).toBe(201);

    const res = await request(app).get('/api/admin/stores?name=fresh').set(auth());
    expect(res.body.data[0]).toMatchObject({ name: newStore().name, email: 'fresh@store.com', rating: null, ownerId: owner.user.id });
  });

  it('rejects owners that are not OWNER role or already own a store', async () => {
    const user = await createUserAndLogin();
    let res = await request(app).post('/api/admin/stores').set(auth()).send(newStore({ ownerId: user.user.id }));
    expect(res.status).toBe(400);
    expect(res.body.errors.ownerId).toBeDefined();

    const owner = await createUserAndLogin({ role: 'OWNER' });
    await request(app).post('/api/admin/stores').set(auth()).send(newStore({ ownerId: owner.user.id }));
    res = await request(app).post('/api/admin/stores').set(auth()).send(newStore({ email: 'other@store.com', ownerId: owner.user.id }));
    expect(res.status).toBe(400);
  });

  it('lists only owners without a store as available', async () => {
    const free = await createUserAndLogin({ role: 'OWNER' });
    const taken = await createUserAndLogin({ role: 'OWNER' });
    await request(app).post('/api/admin/stores').set(auth()).send(newStore({ ownerId: taken.user.id }));
    const res = await request(app).get('/api/admin/owners/available').set(auth());
    expect(res.body.data.map((o) => o.id)).toEqual([free.user.id]);
  });

  it('reports dashboard totals', async () => {
    const store = await request(app).post('/api/admin/stores').set(auth()).send(newStore());
    const rater = await createUserAndLogin();
    await request(app).put(`/api/stores/${store.body.store.id}/rating`).set('Authorization', `Bearer ${rater.token}`).send({ rating: 5 });
    const res = await request(app).get('/api/admin/dashboard').set(auth());
    expect(res.body).toEqual({ totalUsers: 2, totalStores: 1, totalRatings: 1 });
  });
});
