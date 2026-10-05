// End-to-end smoke test against a deployed instance.
// Usage: BASE_URL=https://your-app.vercel.app node scripts/smoke-test.mjs
// Creates records tagged with a run id (emails like smoke-<id>-...@example.com).
const BASE = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/$/, '')
const RUN = Date.now().toString(36)
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Password@123'
let passed = 0
let failed = 0

async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = text }
  return { status: res.status, body: json }
}

async function check(name, fn) {
  try {
    await fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (err) {
    failed++
    console.log(`  ✗ ${name}\n      ${err.message}`)
  }
}

function expect(cond, msg) { if (!cond) throw new Error(msg) }
function expectStatus(res, status) {
  expect(res.status === status, `expected HTTP ${status}, got ${res.status}: ${JSON.stringify(res.body).slice(0, 300)}`)
}

const login = async (email, password = DEMO_PASSWORD) => {
  const res = await call('POST', '/api/auth/login', { body: { email, password } })
  expectStatus(res, 200)
  return res.body.token
}

console.log(`Smoke testing ${BASE} (run ${RUN})\n`)
let admin, user, owner, newUserToken, storeId, ownerId

console.log('Infrastructure')
await check('health reports database up', async () => {
  const res = await call('GET', '/api/health')
  expectStatus(res, 200)
  expect(res.body.database === 'up', 'database not up')
})
for (const path of ['/', '/login', '/register', '/admin/users', '/stores']) {
  await check(`SPA serves ${path}`, async () => {
    const res = await fetch(BASE + path)
    const html = await res.text()
    expect(res.status === 200 && html.includes('<div id="root">'), `got ${res.status}`)
  })
}
await check('static assets are served', async () => {
  const html = await (await fetch(BASE + '/')).text()
  const js = html.match(/<script type="module"[^>]*src="([^"]+)"/)?.[1]
  expect(js, 'no script tag')
  const res = await fetch(BASE + js)
  expect(res.status === 200, `asset ${res.status}`)
})
await check('unknown API route returns JSON 404', async () => expectStatus(await call('GET', '/api/nope'), 404))

console.log('\nAuthentication')
await check('demo accounts can log in', async () => {
  admin = await login('admin@roxiler.com')
  user = await login('user@roxiler.com')
  owner = await login('owner@roxiler.com')
})
await check('wrong password is rejected generically', async () => {
  const res = await call('POST', '/api/auth/login', { body: { email: 'admin@roxiler.com', password: 'Wrong@123' } })
  expectStatus(res, 401)
  expect(res.body.message === 'Invalid email or password', 'unexpected message')
})
await check('signup validates every field', async () => {
  const res = await call('POST', '/api/auth/register', { body: { name: 'short', email: 'bad', address: '', password: 'weak' } })
  expectStatus(res, 400)
  for (const f of ['name', 'email', 'address', 'password']) expect(res.body.errors[f], `no error for ${f}`)
})
await check('signup creates a normal user (role cannot be escalated)', async () => {
  const res = await call('POST', '/api/auth/register', {
    body: { name: 'Smoke Test Signup Account', email: `smoke-${RUN}-signup@example.com`, address: '1 Smoke Lane', password: 'Smoke@123', role: 'ADMIN' },
  })
  expectStatus(res, 201)
  expect(res.body.user.role === 'USER', `role was ${res.body.user.role}`)
  newUserToken = res.body.token
})
await check('/me requires a valid token', async () => {
  expectStatus(await call('GET', '/api/auth/me'), 401)
  expectStatus(await call('GET', '/api/auth/me', { token: newUserToken }), 200)
})

console.log('\nRole-based access')
await check('normal user cannot reach admin API', async () => expectStatus(await call('GET', '/api/admin/dashboard', { token: user }), 403))
await check('owner cannot rate stores', async () => expectStatus(await call('GET', '/api/stores', { token: owner }), 403))
await check('admin cannot use owner dashboard', async () => expectStatus(await call('GET', '/api/owner/dashboard', { token: admin }), 403))

console.log('\nSystem administrator')
let before
await check('dashboard totals', async () => {
  const res = await call('GET', '/api/admin/dashboard', { token: admin })
  expectStatus(res, 200)
  before = res.body
  for (const k of ['totalUsers', 'totalStores', 'totalRatings']) expect(Number.isInteger(res.body[k]), `missing ${k}`)
})
await check('add a store owner user', async () => {
  const res = await call('POST', '/api/admin/users', {
    token: admin,
    body: { name: 'Smoke Test Store Owner Person', email: `smoke-${RUN}-owner@example.com`, address: '2 Smoke Lane', password: 'Owner@123', role: 'OWNER' },
  })
  expectStatus(res, 201)
  ownerId = res.body.user.id
})
await check('add an admin user', async () => {
  const res = await call('POST', '/api/admin/users', {
    token: admin,
    body: { name: 'Smoke Test Administrator Two', email: `smoke-${RUN}-admin@example.com`, address: '3 Smoke Lane', password: 'Admin@123', role: 'ADMIN' },
  })
  expectStatus(res, 201)
})
await check('duplicate email is rejected', async () => {
  const res = await call('POST', '/api/admin/users', {
    token: admin,
    body: { name: 'Smoke Test Administrator Two', email: `SMOKE-${RUN}-admin@example.com`, address: '3 Smoke Lane', password: 'Admin@123', role: 'ADMIN' },
  })
  expectStatus(res, 409)
})
await check('add a store linked to the owner', async () => {
  const res = await call('POST', '/api/admin/stores', {
    token: admin,
    body: { name: `Smoke Test Store ${RUN}`.padEnd(22, 'x'), email: `smoke-${RUN}-store@example.com`, address: '4 Smoke Lane', ownerId },
  })
  expectStatus(res, 201)
  storeId = res.body.store.id
})
await check('filter users by role and email', async () => {
  const res = await call('GET', `/api/admin/users?role=OWNER&email=smoke-${RUN}`, { token: admin })
  expectStatus(res, 200)
  expect(res.body.data.length === 1 && res.body.data[0].id === ownerId, 'filter mismatch')
})
await check('sort users by name both directions', async () => {
  const asc = (await call('GET', '/api/admin/users?sortBy=name&order=asc&limit=100', { token: admin })).body.data.map((u) => u.name)
  const desc = (await call('GET', '/api/admin/users?sortBy=name&order=desc&limit=100', { token: admin })).body.data.map((u) => u.name)
  expect(asc.length > 1 && asc[0] === desc[desc.length - 1], 'sort order mismatch')
})
await check('filter stores by name/address and sort by rating', async () => {
  let res = await call('GET', '/api/admin/stores?address=smoke%20lane', { token: admin })
  expect(res.body.data.some((s) => s.id === storeId), 'store not found by address')
  res = await call('GET', '/api/admin/stores?sortBy=rating&order=desc', { token: admin })
  expectStatus(res, 200)
})
await check('user details include owner rating field', async () => {
  const res = await call('GET', `/api/admin/users/${ownerId}`, { token: admin })
  expectStatus(res, 200)
  expect('rating' in res.body.user && res.body.user.store?.id === storeId, 'missing rating/store')
})

console.log('\nNormal user')
await check('list stores with overall and own rating', async () => {
  const res = await call('GET', '/api/stores?limit=100', { token: newUserToken })
  expectStatus(res, 200)
  const s = res.body.data.find((x) => x.id === storeId)
  expect(s && s.rating === null && s.myRating === null, 'unexpected initial ratings')
})
await check('search stores by name and address', async () => {
  let res = await call('GET', `/api/stores?name=${encodeURIComponent(`Smoke Test Store ${RUN}`)}`, { token: newUserToken })
  expect(res.body.data.length === 1, 'name search failed')
  res = await call('GET', '/api/stores?search=connaught', { token: newUserToken })
  expect(res.body.data.some((x) => /Metro/.test(x.name)), 'address search failed')
})
await check('submit a rating', async () => {
  const res = await call('PUT', `/api/stores/${storeId}/rating`, { token: newUserToken, body: { rating: 4 } })
  expectStatus(res, 201)
})
await check('modify the rating', async () => {
  const res = await call('PUT', `/api/stores/${storeId}/rating`, { token: newUserToken, body: { rating: 2 } })
  expectStatus(res, 200)
  expect(res.body.myRating === 2 && res.body.rating === 2, 'rating not updated')
})
await check('out-of-range rating rejected', async () => {
  expectStatus(await call('PUT', `/api/stores/${storeId}/rating`, { token: newUserToken, body: { rating: 6 } }), 400)
})
await check('dashboard rating total increased', async () => {
  const res = await call('GET', '/api/admin/dashboard', { token: admin })
  expect(res.body.totalRatings === before.totalRatings + 1, `${before.totalRatings} -> ${res.body.totalRatings}`)
})

console.log('\nStore owner')
await check('owner sees average rating and raters', async () => {
  const token = await login(`smoke-${RUN}-owner@example.com`, 'Owner@123')
  const res = await call('GET', '/api/owner/dashboard?sortBy=rating&order=desc', { token })
  expectStatus(res, 200)
  expect(res.body.store.id === storeId && res.body.store.rating === 2, 'wrong store/average')
  expect(res.body.raters.data[0]?.email === `smoke-${RUN}-signup@example.com`, 'rater missing')
})
await check('seeded owner dashboard works', async () => {
  const res = await call('GET', '/api/owner/dashboard', { token: owner })
  expectStatus(res, 200)
  expect(res.body.store?.name, 'no store')
})

console.log('\nPassword change')
await check('password change issues a new token and revokes the old one', async () => {
  await new Promise((r) => setTimeout(r, 1100))
  const res = await call('PATCH', '/api/auth/password', { token: newUserToken, body: { currentPassword: 'Smoke@123', newPassword: 'Smoke@456' } })
  expectStatus(res, 200)
  expectStatus(await call('GET', '/api/auth/me', { token: res.body.token }), 200)
  expectStatus(await call('GET', '/api/auth/me', { token: newUserToken }), 401)
  await login(`smoke-${RUN}-signup@example.com`, 'Smoke@456')
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
