// Browser smoke test of the main user journeys for each role.
// Usage: BASE_URL=https://your-app.vercel.app node scripts/ui-smoke-test.mjs  (needs `playwright`)
import { chromium } from 'playwright'

const BASE = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/$/, '')
const SHOTS = process.env.SHOTS_DIR || 'shots'
const RUN = Date.now().toString(36)
const results = []
console.log(`UI smoke test against ${BASE}`)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1360, height: 860 } })
page.setDefaultTimeout(15000)
const pageErrors = []
page.on('pageerror', (e) => pageErrors.push(e.message))

async function step(name, fn) {
  try {
    await fn()
    results.push(`  ✓ ${name}`)
    console.log(results.at(-1))
  } catch (err) {
    results.push(`  ✗ ${name}: ${err.message.split('\n')[0]}`)
    console.log(results.at(-1))
    await page.screenshot({ path: `${SHOTS}/fail-${results.length}.png` }).catch(() => {})
  }
}
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true })
const login = async (email, password = 'Password@123') => {
  await page.goto(BASE + '/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Log in' }).click()
}
const logout = async () => {
  await page.getByRole('button', { name: 'Log out' }).click()
  await page.waitForURL('**/login')
}

await step('signup form shows validation errors', async () => {
  await page.goto(BASE + '/register')
  await page.getByRole('button', { name: 'Sign up' }).click()
  await page.getByText('Name is required').waitFor()
  await page.getByText('Password is required').waitFor()
  await shot('01-register-errors')
})
await step('sign up and land on the store list', async () => {
  await page.getByLabel('Full name').fill('Browser Smoke Test Account')
  await page.getByLabel('Email').fill(`ui-${RUN}@example.com`)
  await page.getByLabel('Address').fill('9 Browser Street, Test City')
  await page.getByLabel('Password', { exact: true }).fill('Browser@1')
  await page.getByRole('button', { name: 'Sign up' }).click()
  await page.waitForURL('**/stores')
  await page.locator('tbody tr').first().waitFor()
  await shot('02-user-stores')
})
await step('submit then modify a rating', async () => {
  const row = page.locator('tbody tr', { hasText: 'Riverside' })
  await row.locator('.star-option').nth(4).click()
  await row.getByRole('button', { name: 'Submit' }).click()
  await row.getByText('5 / 5').waitFor()
  await row.locator('.star-option').nth(2).click()
  await row.getByRole('button', { name: 'Update' }).click()
  await row.getByText('3 / 5').waitFor()
})
await step('search stores by name', async () => {
  await page.getByPlaceholder('Search by store name').fill('metro')
  await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 1)
  await page.getByRole('button', { name: 'Clear' }).click()
})
await step('sort by overall rating', async () => {
  await page.getByRole('button', { name: 'Overall rating' }).click()
  await page.locator('th[aria-sort="ascending"]').waitFor()
  await page.getByRole('button', { name: 'Overall rating' }).click()
  await page.locator('th[aria-sort="descending"]').waitFor()
})
await step('change password', async () => {
  await page.getByRole('link', { name: 'Change Password' }).click()
  await page.getByLabel('Current password').fill('Browser@1')
  await page.getByLabel('New password', { exact: true }).fill('Browser@2')
  await page.getByLabel('Confirm new password').fill('Browser@2')
  await page.getByRole('button', { name: 'Update password' }).click()
  await page.getByText('Password updated successfully').waitFor()
  await page.getByRole('link', { name: 'Browse Stores' }).click()
  await page.locator('tbody tr').first().waitFor()
})
await step('user cannot open admin pages', async () => {
  await page.goto(BASE + '/admin')
  await page.waitForURL('**/stores')
  await logout()
})

await step('admin dashboard shows totals', async () => {
  await login('admin@roxiler.com')
  await page.waitForURL('**/admin')
  await page.getByText('Total users').waitFor()
  await page.waitForFunction(() => /\d/.test(document.querySelector('.stat-value')?.textContent || ''))
  await shot('03-admin-dashboard')
})
await step('admin adds a store owner', async () => {
  await page.getByRole('link', { name: 'Users' }).click()
  await page.getByRole('button', { name: 'Add user' }).click()
  const d = page.getByRole('dialog')
  await d.getByLabel('Full name').fill('Browser Created Store Owner')
  await d.getByLabel('Email').fill(`ui-${RUN}-owner@example.com`)
  await d.getByLabel('Address').fill('10 Owner Road')
  await d.getByLabel('Password', { exact: true }).fill('Owner@123')
  await d.getByLabel('Role').selectOption('OWNER')
  await d.getByRole('button', { name: 'Create user' }).click()
  await page.getByText('Browser Created Store Owner was added').waitFor()
})
await step('admin filters users by role', async () => {
  await page.getByRole('combobox').selectOption('OWNER')
  await page.waitForFunction(() => [...document.querySelectorAll('tbody tr')].every((r) => r.textContent.includes('Store Owner')))
  await shot('04-admin-users-owners')
})
await step('admin adds a store for the new owner', async () => {
  await page.getByRole('link', { name: 'Stores' }).click()
  await page.getByRole('button', { name: 'Add store' }).click()
  const d = page.getByRole('dialog')
  await d.getByLabel('Store name').fill(`Browser Test Store ${RUN}`)
  await d.getByLabel('Store email').fill(`ui-${RUN}-store@example.com`)
  await d.getByLabel('Address').fill('11 Store Avenue')
  await d.getByLabel('Store owner (optional)').selectOption({ label: `Browser Created Store Owner (ui-${RUN}-owner@example.com)` })
  await d.getByRole('button', { name: 'Create store' }).click()
  await page.locator('tbody tr', { hasText: `Browser Test Store ${RUN}` }).waitFor()
  await shot('05-admin-stores')
})
await step('admin views owner details with rating', async () => {
  await page.getByRole('link', { name: 'Users' }).click()
  await page.getByPlaceholder('Filter by email').fill(`ui-${RUN}-owner`)
  await page.getByRole('link', { name: 'Browser Created Store Owner' }).first().click()
  await page.getByText(`Browser Test Store ${RUN}`).waitFor()
  await shot('06-admin-user-detail')
  await logout()
})

await step('owner dashboard shows average and raters', async () => {
  await login('owner@roxiler.com')
  await page.waitForURL('**/owner')
  await page.getByText('Average rating').waitFor()
  await page.locator('tbody tr').first().waitFor()
  await shot('07-owner-dashboard')
})
await step('mobile layout and navigation drawer', async () => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('button', { name: 'Log out' }).waitFor()
  await shot('08-owner-mobile-nav')
  await logout()
})

await step('no uncaught page errors', async () => {
  if (pageErrors.length) throw new Error(pageErrors.join('; '))
})

await browser.close()
const failedCount = results.filter((r) => r.includes('✗')).length
console.log(`\n${results.length - failedCount} passed, ${failedCount} failed`)
process.exit(failedCount ? 1 : 0)
