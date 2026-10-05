const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');
const migrate = require('../src/db/migrate');
const userService = require('../src/services/userService');

const PASSWORD = 'Secret@123';

async function resetDb() {
  await migrate();
  await pool.query('TRUNCATE ratings, stores, users RESTART IDENTITY CASCADE');
}

async function createUserAndLogin({ role = 'USER', email, name } = {}) {
  const user = await userService.createUser({
    name: name || `Test ${role.toLowerCase()} account holder`,
    email: email || `${role.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}@test.com`,
    password: PASSWORD,
    address: '42 Test Street, Test City',
    role,
  });
  const res = await request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD });
  return { user, token: res.body.token };
}

module.exports = { app, pool, request, resetDb, createUserAndLogin, PASSWORD };
