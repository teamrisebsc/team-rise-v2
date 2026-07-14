const { chromium: playwright } = require('playwright-core')
// @sparticuz/chromium-min ships as a native ES Module ("type":"module") — a
// CJS-side require() of it throws ERR_REQUIRE_ESM on Vercel's Node runtime
// (this worked via require() in local Windows testing, which was misleading;
// the dynamic import is required in production). Loaded lazily inside the
// function that needs it since a CJS file can't `await import()` at top level.
let chromiumPromise
function getChromium() {
  if (!chromiumPromise) chromiumPromise = import('@sparticuz/chromium-min').then(m => m.default)
  return chromiumPromise
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY
const GX_RECRUIT_GOAL = 3
const GX_POINTS_GOAL = 15000

// Version pinned to match the installed @sparticuz/chromium-min release exactly —
// the -min package has no bundled binary, it fetches this pack tar on cold start
// and caches the extracted binary in /tmp for subsequent warm invocations.
const CHROMIUM_PACK_URL = 'https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar'

// GX window resets monthly — deadline is always the last day of the current month
function gxDeadline() {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return lastDay.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function findEntry(rows, name) {
  if (!rows?.length) return null
  if (!name) return rows[0]
  const lower = name.toLowerCase()
  const first = lower.split(' ')[0]
  const exact = rows.find(r => r.name?.toLowerCase() === lower)
  if (exact) return exact
  return rows.find(r => r.name?.toLowerCase().includes(first)) || null
}

const pad2 = n => String(n).padStart(2, '0')

// Personal BSCpro logins are inherently scoped to that person's own production/recruits
// (per BSCpro's own tiering — see bscpro.com pricing: Free/Personal tiers only ever see
// "your personal production"/"your personal recruits"), so unlike the admin baseshop
// scraper this never touches scope_filter — most personal accounts don't even have it.
async function scrapeGxForUser(email, password) {
  const chromium = await getChromium()
  const browser = await playwright.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(CHROMIUM_PACK_URL),
    headless: true,
  })

  try {
    const page = await browser.newPage()
    await page.setViewportSize({ width: 1440, height: 900 })

    await page.goto('https://bscpro.com/auth/login', { waitUntil: 'domcontentloaded', timeout: 25000 })
    await page.waitForSelector('#login', { timeout: 15000 })
    await page.fill('#login', email)
    await page.fill('#password', password)
    await page.click('input[type="submit"]')
    try {
      await page.waitForURL('**/dashboard**', { timeout: 20000 })
    } catch {
      throw new Error('BSCpro login failed — check the email/password saved in Profile Settings.')
    }

    const now = new Date()
    const year = now.getFullYear()
    const monthNum = now.getMonth() + 1
    const monShort = now.toLocaleDateString('en-US', { month: 'short' })
    const startIso = `${year}-${pad2(monthNum)}-01`
    const endIso = `${year}-${pad2(monthNum)}-${pad2(now.getDate())}`
    const rangeInput = `1 ${monShort} ${year} - ${now.getDate()} ${monShort} ${year}`

    // --- Production (net of chargebacks), current month to date ---
    await page.goto('https://bscpro.com/production_new', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(3500)
    await page.evaluate(({ startIso, endIso }) => {
      const $ = window.jQuery || window.$
      if (!$) return
      const el = $('input[name="production_daterange"]')
      if (!el.length) return
      const drp = el.data('daterangepicker')
      const moment = window.moment
      if (!drp || !moment) return
      const start = moment(startIso)
      const end = moment(endIso)
      drp.setStartDate(start)
      drp.setEndDate(end)
      if (typeof drp.callback === 'function') drp.callback(start, end, drp.chosenLabel)
    }, { startIso, endIso })
    await page.waitForTimeout(4000)
    await page.evaluate(() => {
      const grid = window.w2ui && window.w2ui['grid']
      if (grid) { grid.limit = 2000; grid.reload() }
    })
    await page.waitForTimeout(2500)

    const prodRecords = await page.evaluate(() => {
      const grid = window.w2ui && window.w2ui['grid']
      if (!grid || !grid.records) return []
      return grid.records.map(r => ({
        points: parseFloat(r.base_written_points || 0) || 0,
        cb_date: r.cb_date || '',
      }))
    })
    const points = prodRecords
      .filter(r => !(r.cb_date && String(r.cb_date).trim() !== '' && String(r.cb_date).trim() !== '0000-00-00'))
      .reduce((sum, r) => sum + r.points, 0)

    // --- Recruits (active + inactive), current month start dates ---
    await page.goto('https://bscpro.com/speedfilter_new', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(3500)
    await page.evaluate(({ rangeInput }) => {
      const input = document.querySelector('input[name="speedfilter_daterange"]')
      if (input) {
        input.value = rangeInput
        input.dispatchEvent(new Event('change', { bubbles: true }))
      }
      const gridId = Object.keys(window.w2ui || {}).find(k => window.w2ui[k].url?.includes('speedfilter'))
      if (gridId) {
        window.w2ui[gridId].postData = window.w2ui[gridId].postData || {}
        window.w2ui[gridId].postData.select_date = rangeInput
        window.w2ui[gridId].postData.recruit_filter = 'all_recruits' // include inactive — see reference_bscpro_recruit_filter_gap
        window.w2ui[gridId].reload()
      }
    }, { rangeInput })
    await page.waitForTimeout(4000)

    const recruitRecords = await page.evaluate(() => {
      const grid = window.w2ui && window.w2ui['grid']
      if (!grid || !grid.records) return []
      return grid.records.map(r => ({ start_date: r.start_date || '' }))
    })
    const ymSlash = `${year}/${pad2(monthNum)}`
    const ymDash = `${year}-${pad2(monthNum)}`
    const recruits = recruitRecords.filter(r => {
      const d = String(r.start_date || '')
      return d.startsWith(ymSlash) || d.startsWith(ymDash)
    }).length

    return { points, recruits }
  } finally {
    await browser.close()
  }
}

// POST /api/gx-stats — sync this user's own GX numbers from BSCpro (used by the
// "Sync GX" button). Kept in this file rather than a separate api/gx-sync.js
// because Vercel's Hobby plan caps a deployment at 12 Serverless Functions —
// this project was already at 12 before this feature existed.
async function handleSync(event) {
  const name = event.queryStringParameters?.name || ''
  let body = {}
  try { body = JSON.parse(event.body || '{}') } catch {}
  const { bscproEmail, bscproPassword } = body

  if (!bscproEmail || !bscproPassword) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: 'Add your BSCpro email and password in Profile Settings before syncing.' }) }
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: 'Supabase not configured.' }) }
  }

  try {
    const { points, recruits } = await scrapeGxForUser(bscproEmail, bscproPassword)
    const qualified = recruits >= GX_RECRUIT_GOAL && points >= GX_POINTS_GOAL
    const entry = {
      name,
      recruits,
      points: Math.round(points),
      qualified,
      needR: Math.max(0, GX_RECRUIT_GOAL - recruits),
      needP: Math.max(0, GX_POINTS_GOAL - points),
    }

    // Upsert this person's personal ('base') entry — same gx_cache table/shape the
    // local push_gx_to_supabase.mjs bulk push uses, so gx-stats/gx-leaderboard reads
    // don't need to know whether a row came from a personal sync or the admin scrape.
    await fetch(`${SUPABASE_URL}/rest/v1/gx_cache`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify([{ name, data: entry, updated_at: new Date().toISOString() }]),
    })

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        ok: true,
        partners: { current: recruits, goal: GX_RECRUIT_GOAL },
        points: { current: Math.round(points), goal: GX_POINTS_GOAL },
        name,
        qualified,
        deadline: gxDeadline(),
        synced_at: new Date().toISOString(),
      }),
    }
  } catch (e) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: e.message }) }
  }
}

const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }
  if (event.httpMethod === 'POST') return handleSync(event)

  const name = event.queryStringParameters?.name || ''

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ error: 'Supabase env vars not set.' }) }
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/gx_cache?select=name,data,updated_at`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    )
    if (!res.ok) {
      const text = await res.text()
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ error: `Supabase error ${res.status}: ${text.slice(0, 200)}` }) }
    }
    const rows  = await res.json()
    const entry = findEntry(rows, name)
    if (!entry) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ error: 'No GX data found — run Sync GX from the local app.' }) }
    }
    const d = entry.data || {}
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        partners:  { current: d.recruits || 0, goal: 3 },
        points:    { current: Math.round(d.points || 0), goal: 15000 },
        name:      d.name || entry.name,
        qualified: !!d.qualified,
        deadline:  gxDeadline(),
        synced_at: entry.updated_at,
      }),
    }
  } catch (e) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ error: e.message }) }
  }
}

module.exports = require('./_adapt')(handler)
