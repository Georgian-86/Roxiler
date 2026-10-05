const { app, pool, request, resetDb, createUserAndLogin, PASSWORD } = require('./helpers');

const valid = {
  name: 'Jonathan Alexander Smith',
  email: 'Jonathan@Example.com',
  address: '221B Baker Street, London',
  password: 'Strong@Pass1',
};

beforeEach(resetDb);
afterAll(() => pool.end());

describe('POST /api/auth/register', () => {
  it('creates a normal user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...valid, role: 'ADMIN' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toMatchObject({ email: 'jonathan@example.com', role: 'USER' });
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it.each([
    ['name too short', { name: 'Short Name' }, 'name'],
    ['name too long', { name: 'x'.repeat(61) }, 'name'],
    ['address too long', { address: 'a'.repeat(401) }, 'address'],
    ['bad email', { email: 'not-an-email' }, 'email'],
    ['password no uppercase', { password: 'weak@pass1' }, 'password'],
    ['password no special', { password: 'WeakPass12' }, 'password'],
    ['password too short', { password: 'W@k1' }, 'password'],
    ['password too long', { password: 'Waaaaaaaaaaaaaaa@1' }, 'password'],
  ])('rejects %s', async (_label, override, field) => {
    const res = await request(app).post('/api/auth/register').send({ ...valid, ...override });
    expect(res.status).toBe(400);
    expect(res.body.errors[field]).toBeDefined();
  });

  it('keeps +tags in emails instead of rewriting them', async () => {
    const a = await request(app).post('/api/auth/register').send({ ...valid, email: 'a+1@outlook.com' });
    const b = await request(app).post('/api/auth/register').send({ ...valid, email: 'a+2@outlook.com' });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(a.body.user.email).toBe('a+1@outlook.com');
  });

  it('rejects duplicate email case-insensitively', async () => {
    await request(app).post('/api/auth/register').send(valid);
    const res = await request(app).post('/api/auth/register').send({ ...valid, email: 'JONATHAN@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.errors.email).toMatch(/already exists/);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    await request(app).post('/api/auth/register').send(valid);
    const res = await request(app).post('/api/auth/login').send({ email: valid.email, password: valid.password });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('USER');
  });

  it('rejects a wrong password with a generic message', async () => {
    await request(app).post('/api/auth/register').send(valid);
    const res = await request(app).post('/api/auth/login').send({ email: valid.email, password: 'Wrong@Pass1' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('rejects an unknown email with the same message', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@x.com', password: 'Wrong@Pass1' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });
});

describe('GET /api/auth/me', () => {
  it('requires a token', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set('Authorization', 'Bearer junk')).status).toBe(401);
  });
});

describe('PATCH /api/auth/password', () => {
  it.each(['USER', 'OWNER', 'ADMIN'])('lets a %s change their password', async (role) => {
    const { user, token } = await createUserAndLogin({ role });
    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: PASSWORD, newPassword: 'Changed@123' });
    expect(res.status).toBe(200);
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${res.body.token}`);
    expect(me.status).toBe(200);
    const login = await request(app).post('/api/auth/login').send({ email: user.email, password: 'Changed@123' });
    expect(login.status).toBe(200);
  });

  it('revokes tokens issued before the password change', async () => {
    const { token } = await createUserAndLogin();
    // iat has one-second precision; make sure the change happens in a later second.
    await new Promise((r) => setTimeout(r, 1100));
    await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: PASSWORD, newPassword: 'Changed@123' });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/log in again/);
  });

  it('rejects an incorrect current password', async () => {
    const { token } = await createUserAndLogin();
    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Wrong@123', newPassword: 'Changed@123' });
    expect(res.status).toBe(400);
    expect(res.body.errors.currentPassword).toBeDefined();
  });

  it('validates the new password', async () => {
    const { token } = await createUserAndLogin();
    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: PASSWORD, newPassword: 'weak' });
    expect(res.status).toBe(400);
    expect(res.body.errors.newPassword).toBeDefined();
  });
});
