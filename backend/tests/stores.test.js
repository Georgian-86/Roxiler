const { app, pool, request, resetDb, createUserAndLogin } = require('./helpers');
const storeService = require('../src/services/storeService');

let user;
let stores;
const auth = (t = user.token) => ({ Authorization: `Bearer ${t}` });

beforeEach(async () => {
  await resetDb();
  user = await createUserAndLogin();
  stores = [
    await storeService.createStore({ name: 'Alpha Hardware and Tools Depot', email: 'a@s.com', address: 'Pune Camp' }),
    await storeService.createStore({ name: 'Beta Bakery and Confectionery', email: 'b@s.com', address: 'Mumbai Andheri' }),
  ];
});
afterAll(() => pool.end());

describe('normal user stores', () => {
  it('lists stores with overall and own rating', async () => {
    const other = await createUserAndLogin();
    await request(app).put(`/api/stores/${stores[0].id}/rating`).set(auth(other.token)).send({ rating: 2 });
    await request(app).put(`/api/stores/${stores[0].id}/rating`).set(auth()).send({ rating: 5 });

    const res = await request(app).get('/api/stores').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({ name: stores[0].name, rating: 3.5, ratingCount: 2, myRating: 5 });
    expect(res.body.data[1]).toMatchObject({ rating: null, myRating: null });
  });

  it('searches by name or address', async () => {
    let res = await request(app).get('/api/stores?search=bakery').set(auth());
    expect(res.body.data.map((s) => s.id)).toEqual([stores[1].id]);
    res = await request(app).get('/api/stores?search=pune').set(auth());
    expect(res.body.data.map((s) => s.id)).toEqual([stores[0].id]);
    res = await request(app).get('/api/stores?name=alpha&address=mumbai').set(auth());
    expect(res.body.data).toHaveLength(0);
  });

  it('sorts by rating descending with unrated last', async () => {
    await request(app).put(`/api/stores/${stores[1].id}/rating`).set(auth()).send({ rating: 1 });
    const res = await request(app).get('/api/stores?sortBy=rating&order=desc').set(auth());
    expect(res.body.data.map((s) => s.id)).toEqual([stores[1].id, stores[0].id]);
  });

  it('submits then modifies a rating', async () => {
    let res = await request(app).put(`/api/stores/${stores[0].id}/rating`).set(auth()).send({ rating: 3 });
    expect(res.status).toBe(201);
    res = await request(app).put(`/api/stores/${stores[0].id}/rating`).set(auth()).send({ rating: 4 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ myRating: 4, rating: 4, ratingCount: 1 });
  });

  it.each([0, 6, 2.5, 'abc', null])('rejects rating %p', async (rating) => {
    const res = await request(app).put(`/api/stores/${stores[0].id}/rating`).set(auth()).send({ rating });
    expect(res.status).toBe(400);
  });

  it('404s for unknown stores', async () => {
    const res = await request(app).put('/api/stores/9999/rating').set(auth()).send({ rating: 3 });
    expect(res.status).toBe(404);
  });

  it.each(['ADMIN', 'OWNER'])('forbids %s from rating', async (role) => {
    const other = await createUserAndLogin({ role });
    const res = await request(app).put(`/api/stores/${stores[0].id}/rating`).set(auth(other.token)).send({ rating: 3 });
    expect(res.status).toBe(403);
  });
});

describe('store owner dashboard', () => {
  it('shows average rating and raters', async () => {
    const owner = await createUserAndLogin({ role: 'OWNER' });
    const store = await storeService.createStore({ name: 'Owned Store With Many Ratings', email: 'o@s.com', address: 'Delhi', ownerId: owner.user.id });
    const other = await createUserAndLogin({ name: 'Another Rating Customer Name' });
    await request(app).put(`/api/stores/${store.id}/rating`).set(auth()).send({ rating: 5 });
    await request(app).put(`/api/stores/${store.id}/rating`).set(auth(other.token)).send({ rating: 2 });

    const res = await request(app).get('/api/owner/dashboard?sortBy=rating&order=asc').set(auth(owner.token));
    expect(res.status).toBe(200);
    expect(res.body.store).toMatchObject({ id: store.id, rating: 3.5, ratingCount: 2 });
    expect(res.body.store.distribution.find((d) => d.rating === 5).count).toBe(1);
    expect(res.body.raters.data.map((r) => r.rating)).toEqual([2, 5]);
    expect(res.body.raters.data[0]).toMatchObject({ name: 'Another Rating Customer Name' });
  });

  it('handles owners without a store', async () => {
    const owner = await createUserAndLogin({ role: 'OWNER' });
    const res = await request(app).get('/api/owner/dashboard').set(auth(owner.token));
    expect(res.status).toBe(200);
    expect(res.body.store).toBeNull();
  });

  it('forbids normal users', async () => {
    expect((await request(app).get('/api/owner/dashboard').set(auth())).status).toBe(403);
  });
});
