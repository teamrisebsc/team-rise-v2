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

function normalizeName(s) {
  return String(s || '')
    .replace(/\s*\([A-Za-z0-9]{4,8}\)\s*$/, '') // strip trailing "(CODE)"
    .trim()
    .toLowerCase()
}

// Requires every word of the target name to appear in the candidate — safer than a
// bare .includes() (which would match any "Kaili ___" against a lone "Kaili").
function nameMatches(candidate, target) {
  const c = normalizeName(candidate)
  const tParts = normalizeName(target).split(' ').filter(Boolean)
  return c && tParts.length > 0 && tParts.every(p => c.includes(p))
}

function extractAgentNames(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.map(a => {
      if (typeof a === 'string') {
        const m = a.match(/agent_name='([^']+)'/)
        return m ? m[1].trim() : a.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      }
      return a?.name || a?.agent_name || ''
    }).filter(Boolean)
  }
  if (typeof raw === 'string') {
    const matches = raw.match(/agent_name='([^']+)'/g)
    if (matches) return matches.map(m => m.match(/agent_name='([^']+)'/)[1].trim())
    const plain = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    return plain ? [plain] : []
  }
  if (typeof raw === 'object') {
    const n = raw.name || raw.agent_name
    return n ? [n.trim()] : []
  }
  return []
}

function extractRecruiterName(raw) {
  if (!raw) return ''
  if (typeof raw === 'string') return raw.trim()
  if (typeof raw === 'object') return (raw.name || raw.agent_name || '').trim()
  return String(raw)
}

// Olivia/most SMD-tier BSCpro logins have baseshop-wide visibility — production_new
// and speedfilter_new return EVERYONE'S records, not just the logged-in person's own
// (confirmed live 7/15/26: Olivia's login returned 7 recruits, none of which were
// actually hers). "Personal" GX credit must be attributed the same way the admin
// baseshop scraper does it: only count a production record if this person's name is
// among its listed agents, and only count a recruit if this person is its recruiter —
// login scope alone (Free/Personal tier accounts, which BSCpro's own pricing page
// describes as self-scoped) is not something we can rely on for every account tier.
async function scrapeGxForUser(email, password, name) {
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
        agents: r.agents || r.agent_name || r.agent || null,
      }))
    })
    const myProdRecords = prodRecords.filter(r => extractAgentNames(r.agents).some(a => nameMatches(a, name)))
    const points = myProdRecords
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
      return grid.records.map(r => ({ start_date: r.start_date || '', recruiter: r.recruiter || null }))
    })
    const ymSlash = `${year}/${pad2(monthNum)}`
    const ymDash = `${year}-${pad2(monthNum)}`
    const recruits = recruitRecords.filter(r => {
      const d = String(r.start_date || '')
      const inMonth = d.startsWith(ymSlash) || d.startsWith(ymDash)
      return inMonth && nameMatches(extractRecruiterName(r.recruiter), name)
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

  if (!name.trim()) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: 'Your profile has no name set — add your full name in Profile Settings before syncing.' }) }
  }
  if (!bscproEmail || !bscproPassword) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: 'Add your BSCpro email and password in Profile Settings before syncing.' }) }
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: 'Supabase not configured.' }) }
  }

  try {
    const { points, recruits } = await scrapeGxForUser(bscproEmail, bscproPassword, name)
    const qualified = recruits >= GX_RECRUIT_GOAL && points >= GX_POINTS_GOAL
    const entry = {
      name,
      recruits,
      points: Math.round(points),
      qualified,
      needR: Math.max(0, GX_RECRUIT_GOAL - recruits),
      needP: Math.max(0, GX_POINTS_GOAL - points),
      scope: 'personal',
    }

    // Tagged 'personal' (not 'base') so this NEVER lands in gx-leaderboard.js's
    // team-board scopes (base/superbase/hierarchy). Two reasons: (1) a lone
    // personal-sync row would become the newest updated_at for that scope,
    // and gx-leaderboard's freshness window (rows within 10min of the scope's
    // own max timestamp) would then knock every legitimately bulk-pushed agent
    // off the board — confirmed live 7/15/26, a single test sync wiped the
    // entire Base board down to just that one synced name. (2) team leaders
    // (Olivia/Tracy) are deliberately excluded from their own team's GX board
    // (see EXCLUDED set in scrape_gx_jul2026_net.js) but still need their
    // personal sync to populate the "My GX" widget via gx-stats GET, which
    // reads by name across all scopes regardless of tag.
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
