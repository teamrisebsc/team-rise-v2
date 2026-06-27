import http from 'http'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const SCRIPT_DIR    = 'C:/Users/Mouth/bsc-appointment-workflow'
const SCRAPER_DIR   = 'C:/Users/Mouth/bscpro-scraper'
const GX_CACHE_FILE = 'C:/Users/Mouth/bscpro-scraper/data/gx_final_jun2026.json'
const SKILLS_DIR    = 'C:/Users/Mouth/.claude/commands'

// Load .env so VITE_SUPABASE_* are available
try {
  const envFile = fs.readFileSync(new URL('.env', import.meta.url), 'utf-8')
  for (const line of envFile.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
} catch {}

async function pushGxToSupabase(entries) {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key || !entries?.length) return
  const rows = entries.map(e => ({
    name:       e.name,
    data:       e,
    updated_at: new Date().toISOString(),
  }))
  try {
    const res = await fetch(`${url}/rest/v1/gx_cache`, {
      method: 'POST',
      headers: {
        apikey:         key,
        Authorization:  `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer:         'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows),
    })
    if (!res.ok) console.error('[gx] Supabase push error:', res.status, await res.text())
    else console.log(`[gx] Pushed ${rows.length} entries to Supabase`)
  } catch (e) {
    console.error('[gx] Supabase push failed:', e.message)
  }
}

const TAG = {
  'Step 1':     '107687',
  'Step 2':     '107688',
  'Step 3':     '107689',
  'Step 4':     '107690',
  'Step 5':     '107691',
  'Phone Zone': '107692',
  'BPM/VGO':   '107739',
  'Other':      '222',
}

function getTagValue(step) {
  if (step === 'Step 1') return `${TAG['Step 1']},${TAG['Step 2']}`
  return TAG[step] || TAG['Other']
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => { try { resolve(JSON.parse(body)) } catch(e) { reject(e) } })
  })
}

function runScript(scriptName, args, env = process.env) {
  return new Promise((resolve) => {
    const proc = spawn('node', [path.join(SCRIPT_DIR, 'scripts', scriptName), ...args], {
      cwd: SCRIPT_DIR,
      env,
    })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', d => { stdout += d; process.stdout.write(d) })
    proc.stderr.on('data', d => { stderr += d; process.stderr.write(d) })
    proc.on('close', code => {
      const resultTag = scriptName.includes('matchup') ? '[MATCHUP_RESULT]' : scriptName.includes('followup') ? '[FOLLOWUP_RESULT]' : '[APPOINTMENT_RESULT]'
      const line = stdout.split('\n').find(l => l.includes(resultTag))
      if (line) {
        try {
          const json = JSON.parse(line.replace(resultTag, '').trim())
          resolve({ ok: true, ...json })
        } catch {
          resolve({ ok: false, error: 'Failed to parse result', stdout, stderr })
        }
      } else {
        resolve({ ok: code === 0, stdout, stderr, error: code !== 0 ? 'Script exited with error' : null })
      }
    })
  })
}

function findEntry(data, name) {
  if (!data?.length) return null
  if (name) {
    const first = name.split(' ')[0].toLowerCase()
    const exact = data.find(a => a.name?.toLowerCase() === name.toLowerCase())
    if (exact) return exact
    const partial = data.find(a => a.name?.toLowerCase().includes(first))
    if (partial) return partial
    return null  // name given but not found — caller should show zeros, not someone else's data
  }
  return data[0]
}

function extractSheetId(input) {
  if (!input) return null
  const m = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  return m ? m[1] : input.trim()
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQuotes = !inQuotes }
    else if (line[i] === ',' && !inQuotes) { result.push(current); current = '' }
    else { current += line[i] }
  }
  result.push(current)
  return result
}

const server = http.createServer(async (req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
    'Content-Type': 'application/json',
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors)
    res.end()
    return
  }

  // POST /api/daily-report — build report from local cache files (no Supabase needed for local dev)
  if (req.method === 'POST' && req.url?.startsWith('/api/daily-report')) {
    try {
      const MONTHS = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December']
      const MONTH_ABBRS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
      const now = new Date()
      const monthPrefix = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}`
      const monthName   = MONTHS[now.getMonth()]

      // Recruits
      let recruits = null
      try {
        const cache = JSON.parse(fs.readFileSync('C:/Users/Mouth/bscpro-scraper/data/daily_report_cache.json','utf-8'))
        const month = (cache.recruits||[]).filter(r=>(r.start_date||'').startsWith(monthPrefix))
        const c = { rise:0, ffg:0, ignite:0, praise:0, freedom:0 }
        for (const r of month) {
          const tl = (r.team_leader||'').trim()
          if      (tl==='FFG')     c.ffg++
          else if (tl==='Ignite')  c.ignite++
          else if (tl==='Praise')  c.praise++
          else if (tl==='Freedom') c.freedom++
          else                      c.rise++
        }
        c.total = c.rise + c.ffg + c.ignite + c.praise + c.freedom
        recruits = c
      } catch(_) {}

      // Families helped
      let families_helped = null
      try {
        const csv   = fs.readFileSync('C:/Users/Mouth/bscpro-scraper/data/net_points.csv','utf-8')
        const lines = csv.split('\n').filter(l=>l.trim())
        if (lines.length >= 2) {
          const cols = parseCSVLine(lines[1])
          const pn   = s => parseFloat((s||'0').replace(/,/g,''))||0
          const gb   = pn(cols[3])
          const gsb  = pn(cols[5])
          families_helped = { gross_personal: pn(cols[1]), gross_base: gb, gross_super_base: gsb, super_base_contribution: Math.round(gsb-gb), snapshot_date: cols[0]||'' }
        }
      } catch(_) {}

      // GX top 5
      let gx_top5 = null
      try {
        const gxFn   = `C:/Users/Mouth/bscpro-scraper/data/gx_final_${MONTH_ABBRS[now.getMonth()]}${now.getFullYear()}.json`
        const gxData = JSON.parse(fs.readFileSync(gxFn,'utf-8'))
        gx_top5 = [...gxData].sort((a,b)=>a.score-b.score).slice(0,5).map(a=>({
          name: a.name, recruits: a.recruits||0, points: Math.round(a.points||0),
          needR: a.needR||0, needP: Math.round(a.needP||0), qualified: !!a.qualified,
        }))
      } catch(_) {}

      // Licensing
      let licensing = null
      try {
        const lic   = JSON.parse(fs.readFileSync('C:/Users/Mouth/bscpro-scraper/data/licensing_tracker.json','utf-8'))
        licensing = {
          total:          lic.length,
          test_scheduled: lic.filter(r=>r.blocker_category==='Test Scheduled').map(r=>({ name:r.name, state:r.state||'', testDate:r.test_date_fl||r.test_date_ny||'' })),
          needs_retake:   lic.filter(r=>r.blocker_category==='Needs Retake / Check Status').length,
        }
      } catch(_) {}

      const fmt = n => Math.round(n).toLocaleString('en-US')
      const dateStr = now.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})
      const timeStr = now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})
      const p = []

      p.push(`<div class="r-header"><div class="r-title">📊 Team RISE Daily Briefing</div><div class="r-subtitle">${dateStr} &nbsp;·&nbsp; data as of ${timeStr}</div></div>`)

      // Recruits
      p.push(`<div class="r-section"><div class="r-section-head">👥 Recruits — ${monthName}</div>`)
      if (recruits) {
        p.push(`<div class="r-stat-row">`)
        p.push(`<div class="r-stat"><div class="r-stat-num">${recruits.rise}</div><div class="r-stat-label">RISE baseshop</div></div>`)
        if (recruits.ffg    > 0) p.push(`<div class="r-stat"><div class="r-stat-num">${recruits.ffg}</div><div class="r-stat-label">FFG</div></div>`)
        if (recruits.ignite > 0) p.push(`<div class="r-stat"><div class="r-stat-num">${recruits.ignite}</div><div class="r-stat-label">Ignite</div></div>`)
        if (recruits.praise > 0) p.push(`<div class="r-stat"><div class="r-stat-num">${recruits.praise}</div><div class="r-stat-label">Praise</div></div>`)
        if (recruits.freedom > 0) p.push(`<div class="r-stat"><div class="r-stat-num">${recruits.freedom}</div><div class="r-stat-label">Freedom</div></div>`)
        p.push(`<div class="r-stat r-stat--total"><div class="r-stat-num">${recruits.total}</div><div class="r-stat-label">Total</div></div></div>`)
      } else { p.push(`<div class="r-unavail">Recruit data unavailable</div>`) }
      p.push(`</div>`)

      // Families Helped
      p.push(`<div class="r-section"><div class="r-section-head">👨‍👩‍👧 Families Helped — ${monthName} (pts)</div>`)
      if (families_helped) {
        const fh = families_helped
        p.push(`<div class="r-stat-row">`)
        p.push(`<div class="r-stat"><div class="r-stat-num">$${fmt(fh.gross_base)}</div><div class="r-stat-label">RISE baseshop</div></div>`)
        p.push(`<div class="r-stat"><div class="r-stat-num">$${fmt(fh.super_base_contribution)}</div><div class="r-stat-label">Superbase SMDs</div></div>`)
        p.push(`<div class="r-stat r-stat--total"><div class="r-stat-num">$${fmt(fh.gross_super_base)}</div><div class="r-stat-label">Total hierarchy</div></div></div>`)
      } else { p.push(`<div class="r-unavail">mywfg data unavailable</div>`) }
      p.push(`</div>`)

      // GX Top 5
      p.push(`<div class="r-section"><div class="r-section-head">🏆 GX Top 5 — Closest to Qualified</div>`)
      if (gx_top5?.length) {
        p.push(`<div class="r-gx-list">`)
        gx_top5.forEach((a,i) => {
          const cls = a.qualified ? ' r-gx-qualified' : ''
          const needs = !a.qualified ? (() => { const n=[]; if(a.needR>0)n.push(`${a.needR} rec`); if(a.needP>0)n.push(`$${fmt(a.needP)} pts`); return n.join(' + ') })() : ''
          p.push(`<div class="r-gx-row${cls}"><span class="r-gx-rank">${i+1}</span><span class="r-gx-name">${a.name}</span><span class="r-gx-progress">${a.recruits}/3 rec &nbsp;·&nbsp; ${fmt(a.points)} pts</span>${a.qualified ? `<span class="r-gx-qualified-badge">✅ Qualified!</span>` : `<span class="r-gx-needs">${needs ? 'needs '+needs : ''}</span>`}</div>`)
        })
        p.push(`</div>`)
      } else { p.push(`<div class="r-unavail">GX data unavailable</div>`) }
      p.push(`</div>`)

      // Licensing
      p.push(`<div class="r-section">`)
      if (licensing) {
        p.push(`<div class="r-section-head">🔓 Licensing — ${licensing.total} in pipeline</div>`)
        if (licensing.test_scheduled?.length) {
          p.push(`<div class="r-lic-sub-head">Tests scheduled</div><div class="r-lic-list">`)
          licensing.test_scheduled.forEach(t => p.push(`<div class="r-lic-row">${t.name}${t.state ? ` (${t.state})` : ''} — ${t.testDate}</div>`))
          p.push(`</div>`)
        }
        if (licensing.needs_retake > 0) p.push(`<div class="r-lic-retake">⚠ ${licensing.needs_retake} agents need retake</div>`)
      } else {
        p.push(`<div class="r-section-head">🔓 Licensing</div><div class="r-unavail">Licensing data unavailable</div>`)
      }
      p.push(`</div>`)

      res.writeHead(200, cors)
      res.end(JSON.stringify({ ok: true, html: true, response: p.join('\n') }))
    } catch(e) {
      res.writeHead(200, cors)
      res.end(JSON.stringify({ ok: false, error: `Daily report error: ${e.message}` }))
    }
    return
  }

  // GET /api/gx-stats — read cached GX data for the logged-in user
  if (req.method === 'GET' && req.url?.startsWith('/api/gx-stats')) {
    try {
      const urlObj = new URL(req.url, 'http://localhost')
      const name   = urlObj.searchParams.get('name') || ''
      const raw    = fs.readFileSync(GX_CACHE_FILE, 'utf-8')
      const data   = JSON.parse(raw)
      const entry  = findEntry(data, name)
      res.writeHead(200, cors)
      res.end(JSON.stringify({
        partners: { current: entry?.recruits || 0, goal: 3 },
        points:   { current: Math.round(entry?.points || 0), goal: 15000 },
        name:     entry?.name || name,
        qualified: !!entry?.qualified,
        deadline: 'June 30, 2026',
        not_found: !entry,
      }))
    } catch(e) {
      res.writeHead(200, cors)
      res.end(JSON.stringify({ error: 'No cached data — click Sync GX to fetch.' }))
    }
    return
  }

  // POST /api/gx-sync — run the scraper, wait, return fresh stats
  if (req.method === 'POST' && req.url?.startsWith('/api/gx-sync')) {
    try {
      const urlObj = new URL(req.url, 'http://localhost')
      const name   = urlObj.searchParams.get('name') || ''
      let body = {}
      try { body = await parseBody(req) } catch(e) { /* no body is fine */ }
      const { bscproEmail, bscproPassword } = body
      const scriptEnv = {
        ...process.env,
        ...(bscproEmail    && { BSC_PRO_EMAIL:    bscproEmail }),
        ...(bscproPassword && { BSC_PRO_PASSWORD: bscproPassword }),
      }
      await new Promise((resolve, reject) => {
        const proc = spawn('node', ['scrape_gx_baseshop_jun2026.js'], {
          cwd: SCRAPER_DIR,
          env: scriptEnv,
        })
        proc.stdout.on('data', d => process.stdout.write(d))
        proc.stderr.on('data', d => process.stderr.write(d))
        proc.on('close', code => code === 0 ? resolve() : reject(new Error(`Scraper exited ${code}`)))
      })
      const raw   = fs.readFileSync(GX_CACHE_FILE, 'utf-8')
      const data  = JSON.parse(raw)
      await pushGxToSupabase(data)
      const entry = findEntry(data, name)
      res.writeHead(200, cors)
      res.end(JSON.stringify({
        ok: true,
        partners: { current: entry?.recruits || 0, goal: 3 },
        points:   { current: Math.round(entry?.points || 0), goal: 15000 },
        name:     entry?.name || name,
        qualified: !!entry?.qualified,
        deadline: 'June 30, 2026',
      }))
    } catch(e) {
      res.writeHead(500, cors)
      res.end(JSON.stringify({ ok: false, error: e.message }))
    }
    return
  }

  if (req.method === 'GET' && req.url?.startsWith('/api/pipeline')) {
    try {
      const urlObj = new URL(req.url, 'http://localhost')
      const rawId  = urlObj.searchParams.get('sheet_id')
      const sheetId = extractSheetId(rawId)
      const tab    = urlObj.searchParams.get('tab') || 'Sheet1'

      if (!sheetId) {
        res.writeHead(400, cors)
        res.end(JSON.stringify({ error: 'Missing sheet_id' }))
        return
      }

      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`
      const csvRes = await fetch(csvUrl)
      if (!csvRes.ok) throw new Error(`Sheet returned ${csvRes.status}`)
      const csv = await csvRes.text()

      const lines = csv.split('\n').filter(l => l.trim())
      let dataStart = 0
      let headerCols = []
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toUpperCase().includes('FIRST NAME')) {
          headerCols = parseCSVLine(lines[i]).map(h => h.replace(/"/g, '').trim().toLowerCase())
          dataStart = i + 1
          break
        }
      }

      function colIdx(keywords) {
        for (const kw of keywords) {
          const i = headerCols.findIndex(h => h.includes(kw))
          if (i !== -1) return i
        }
        return -1
      }
      const phoneIdx = colIdx(['phone', 'cell', 'mobile', 'number'])
      const emailIdx = colIdx(['email', 'e-mail'])

      const prospects = []
      for (let i = dataStart; i < lines.length && prospects.length < 30; i++) {
        const cols      = parseCSVLine(lines[i])
        const firstName = cols[0]?.replace(/"/g, '').trim()
        if (!firstName) continue
        const lastName  = cols[1]?.replace(/"/g, '').trim() || ''
        const name      = [firstName, lastName].filter(Boolean).join(' ')
        const last      = cols[4]?.replace(/"/g, '').trim() || 'N/A'
        const result    = cols[5]?.replace(/"/g, '').trim() || ''
        const notes     = cols[14]?.replace(/"/g, '').trim() || ''
        const phone     = phoneIdx >= 0 ? (cols[phoneIdx]?.replace(/"/g, '').trim() || '') : ''
        const email     = emailIdx >= 0 ? (cols[emailIdx]?.replace(/"/g, '').trim() || '') : ''
        const combined  = (result + ' ' + notes).toLowerCase()

        let heat = 'warm'
        if (combined.includes('interested') || combined.includes('considering') || combined.includes('wants to') || combined.includes('in person')) heat = 'hot'
        else if (combined.includes('is a recruit') || combined.includes('recruited') || combined.includes('converted') || combined.includes('iul')) heat = 'cool'

        prospects.push({ name, role: 'Prospect', heat, last: last.split(' ')[0] || last, note: result || notes, phone, email })
      }

      res.writeHead(200, cors)
      res.end(JSON.stringify({ prospects }))
    } catch (err) {
      res.writeHead(500, cors)
      res.end(JSON.stringify({ error: err.message }))
    }
    return
  }

  if (req.method === 'POST' && req.url === '/api/book-appointment') {
    try {
      const body = await parseBody(req)
      const { type, step, date, time, contact, phone, email, state, notes,
              happened, fna, secondAppt, referrals, bpm, edified, sale, ama,
              followupDate, followupTime, followupStep,
              prodProvider, prodProduct, prodPolicy, prodPoints, prodNotes, prodReferrals,
              bpmDate, bpmNote,
              bscproEmail, bscproPassword, zoomLink } = body

      // Per-user credentials override the .env defaults
      const scriptEnv = {
        ...process.env,
        ...(bscproEmail    && { BSC_PRO_EMAIL:    bscproEmail }),
        ...(bscproPassword && { BSC_PRO_PASSWORD: bscproPassword }),
        ...(zoomLink       && { ZOOM_LINK:         zoomLink }),
      }

      const datetime = `${date} ${time}`

      let scriptName, args
      if (type === 'followup') {
        scriptName = 'bsc_followup.js'
        args = [
          '--contact',     contact,
          '--happened',    happened    || 'yes',
          '--fna',         fna         || 'no',
          '--second-appt', secondAppt  || 'no',
          '--referrals',   referrals   || 'no',
          '--bpm',         bpm         || 'no',
          '--sale',        sale        || 'not-yet',
          '--ama',         ama         || 'no',
          '--submit',
        ]
        if (edified) args.push('--edified', edified)
        if (secondAppt === 'yes' && followupDate && followupTime) {
          const fuDateStr = new Date(followupDate + 'T00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
          const [fh, fm]  = followupTime.split(':')
          const fhr       = parseInt(fh)
          const fampm     = fhr >= 12 ? 'PM' : 'AM'
          const fhr12     = ((fhr % 12) || 12).toString().padStart(2, '0')
          args.push('--followup-date', `${fuDateStr} ${fhr12}:${fm} ${fampm}`)
          args.push('--followup-step', followupStep || 'Step 2')
        }
        if (bpm === 'yes' && bpmDate) {
          const bpmDateStr = new Date(bpmDate + 'T00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
          args.push('--bpm-date', bpmDateStr)
          if (bpmNote) args.push('--bpm-note', bpmNote)
        }
        if (sale === 'yes') {
          if (prodProvider) args.push('--prod-provider', prodProvider)
          if (prodProduct)  args.push('--prod-product',  prodProduct)
          if (prodPolicy)   args.push('--prod-policy',   prodPolicy)
          if (prodPoints)   args.push('--prod-points',   prodPoints)
          if (prodNotes)    args.push('--prod-notes',    prodNotes)
          if (prodReferrals)args.push('--prod-referrals',prodReferrals)
        }
        console.log(`\n[book-appointment] follow-up | ${contact}`)
      } else {
        scriptName = type === 'matchup' ? 'bsc_matchup.js' : 'bsc_personal_appointment.js'
        const typeValue     = getTagValue(step)
        const prospectState = state || 'California'
        args = [
          '--date',           datetime,
          '--duration',       '30',
          '--type-value',     typeValue,
          '--contact',        contact,
          '--prospect-state', prospectState,
          '--notes',          notes || '',
          '--submit',
        ]
        if (phone) args.push('--phone', phone)
        if (email) args.push('--email', email)
        console.log(`\n[book-appointment] ${type} | ${step} | ${contact} | ${datetime}`)
      }

      const result = await runScript(scriptName, args, scriptEnv)

      res.writeHead(200, cors)
      res.end(JSON.stringify(result))
    } catch (err) {
      res.writeHead(500, cors)
      res.end(JSON.stringify({ ok: false, error: err.message }))
    }
    return
  }

  // GET /api/recruit-pipeline — read Fast Start pipeline from Google Sheet
  if (req.method === 'GET' && req.url?.startsWith('/api/recruit-pipeline')) {
    try {
      const urlObj = new URL(req.url, 'http://localhost')
      const trainerName = urlObj.searchParams.get('name') || ''
      const result = await new Promise((resolve) => {
        const args = ['read_fast_start.js']
        if (trainerName) args.push('--trainer', trainerName)
        const proc = spawn('node', args, { cwd: SCRAPER_DIR })
        let out = ''
        proc.stdout.on('data', d => { out += d })
        proc.stderr.on('data', d => process.stderr.write(d))
        proc.on('close', () => {
          const line = out.split('\n').find(l => l.includes('[FAST_START_RESULT]'))
          if (line) {
            try { resolve(JSON.parse(line.replace('[FAST_START_RESULT]', '').trim())) }
            catch { resolve({ recruits: [] }) }
          } else {
            resolve({ recruits: [] })
          }
        })
      })
      res.writeHead(200, cors)
      res.end(JSON.stringify(result))
    } catch (err) {
      res.writeHead(500, cors)
      res.end(JSON.stringify({ recruits: [], error: err.message }))
    }
    return
  }

  // POST /api/recruit-step3 — toggle Step 3 Done for a recruit
  if (req.method === 'POST' && req.url === '/api/recruit-step3') {
    try {
      const body = await parseBody(req)
      const { code, done } = body
      if (!code) throw new Error('code required')
      const result = await new Promise((resolve) => {
        const proc = spawn('node', ['update_step3.js', '--code', code, '--done', String(done)], { cwd: SCRAPER_DIR })
        let out = ''
        proc.stdout.on('data', d => { out += d })
        proc.stderr.on('data', d => process.stderr.write(d))
        proc.on('close', () => {
          const line = out.split('\n').find(l => l.includes('[UPDATE_STEP3_RESULT]'))
          if (line) {
            try { resolve(JSON.parse(line.replace('[UPDATE_STEP3_RESULT]', '').trim())) }
            catch { resolve({ ok: false }) }
          } else {
            resolve({ ok: false })
          }
        })
      })
      res.writeHead(200, cors)
      res.end(JSON.stringify(result))
    } catch (err) {
      res.writeHead(500, cors)
      res.end(JSON.stringify({ ok: false, error: err.message }))
    }
    return
  }

  // GET /api/skills — list available skill files
  if (req.method === 'GET' && req.url === '/api/skills') {
    try {
      const files = fs.readdirSync(SKILLS_DIR).filter(f => f.endsWith('.md'))
      const skills = files.map(f => ({
        id:   f.replace('.md', ''),
        name: f.replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        file: f,
      }))
      res.writeHead(200, cors)
      res.end(JSON.stringify({ skills }))
    } catch(e) {
      res.writeHead(200, cors)
      res.end(JSON.stringify({ skills: [] }))
    }
    return
  }

  // POST /api/run-skill — call Anthropic API with optional skill file as context
  if (req.method === 'POST' && req.url === '/api/run-skill') {
    try {
      const body = await parseBody(req)
      const { prompt, skillFile, apiKey } = body
      const key = apiKey || process.env.ANTHROPIC_API_KEY
      if (!key) {
        res.writeHead(200, cors)
        res.end(JSON.stringify({ ok: false, error: 'No API key configured. Add your Anthropic API key in Profile Settings.' }))
        return
      }

      let systemPrompt = 'You are a helpful AI assistant for Team RISE at WFG (World Financial Group). ' +
        'Respond with clear, well-structured reports. Use headers, bullet points, and bold text to organize information. ' +
        'Be concise but thorough. Format numbers clearly.'

      if (skillFile) {
        try {
          const skillPath = path.join(SKILLS_DIR, skillFile.endsWith('.md') ? skillFile : skillFile + '.md')
          const skillContent = fs.readFileSync(skillPath, 'utf-8')
          systemPrompt = skillContent + '\n\n---\n\n' + systemPrompt
        } catch(e) { /* skill file not found, use default */ }
      }

      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key':          key,
          'anthropic-version':  '2023-06-01',
          'content-type':       'application/json',
        },
        body: JSON.stringify({
          model:      'claude-sonnet-4-6',
          max_tokens: 4096,
          system:     systemPrompt,
          messages:   [{ role: 'user', content: prompt }],
        }),
      })

      if (!anthropicRes.ok) {
        const errText = await anthropicRes.text()
        res.writeHead(200, cors)
        res.end(JSON.stringify({ ok: false, error: `API error ${anthropicRes.status}: ${errText.slice(0, 200)}` }))
        return
      }

      const result = await anthropicRes.json()
      const response = result.content?.[0]?.text || 'No response.'
      res.writeHead(200, cors)
      res.end(JSON.stringify({ ok: true, response }))
    } catch(e) {
      res.writeHead(500, cors)
      res.end(JSON.stringify({ ok: false, error: e.message }))
    }
    return
  }

  res.writeHead(404, cors)
  res.end(JSON.stringify({ error: 'Not found' }))
})

server.listen(3001, async () => {
  console.log('[API] Appointment server running on http://localhost:3001')
  try {
    const raw = fs.readFileSync(GX_CACHE_FILE, 'utf-8')
    await pushGxToSupabase(JSON.parse(raw))
  } catch {}
})
