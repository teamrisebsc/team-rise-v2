/**
 * Team RISE Appointment Worker
 * Runs on Oracle Cloud Always Free VM.
 * Polls Supabase appointment_queue, runs BSCpro Playwright scripts, writes results back.
 * Start with: pm2 start appointment_worker.mjs --name appt-worker
 */

import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load .env
try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8')
  for (const line of envFile.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
} catch {}

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY  = process.env.VITE_SUPABASE_ANON_KEY
const SCRIPTS_DIR   = path.join(__dirname, 'scripts')
const POLL_MS       = 5000

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[worker] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env')
  process.exit(1)
}

const TAG = {
  'Step 1':     process.env.TAG_STEP1    || '107687',
  'Step 2':     process.env.TAG_STEP2    || '107688',
  'Step 3':     process.env.TAG_STEP3    || '107689',
  'Step 4':     process.env.TAG_STEP4    || '107690',
  'Step 5':     process.env.TAG_STEP5    || '107691',
  'Phone Zone': process.env.TAG_PHONEZONE || '107692',
  'BPM/VGO':   process.env.TAG_BPM      || '107739',
  'Other':      process.env.TAG_OTHER    || '222',
}

function getTagValue(step) {
  if (step === 'Step 1') return `${TAG['Step 1']},${TAG['Step 2']}`
  return TAG[step] || TAG['Other']
}

async function sb(method, endpoint, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    method,
    headers: {
      apikey:         SUPABASE_KEY,
      Authorization:  `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer:         'return=representation',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Supabase ${method} ${endpoint}: ${res.status} ${text}`)
  return text ? JSON.parse(text) : null
}

async function claimJob() {
  const rows = await sb('GET', 'appointment_queue?status=eq.pending&order=created_at.asc&limit=1')
  if (!rows?.length) return null
  const job = rows[0]
  await sb('PATCH', `appointment_queue?id=eq.${job.id}`, { status: 'processing' })
  return job
}

async function completeJob(id, result) {
  await sb('PATCH', `appointment_queue?id=eq.${id}`, {
    status: 'complete',
    result,
    completed_at: new Date().toISOString(),
  })
}

async function failJob(id, errorMsg) {
  await sb('PATCH', `appointment_queue?id=eq.${id}`, {
    status: 'error',
    error_msg: errorMsg,
    completed_at: new Date().toISOString(),
  })
}

function runScript(scriptName, args, env) {
  return new Promise((resolve) => {
    const proc = spawn('node', [path.join(SCRIPTS_DIR, scriptName), ...args], {
      cwd: __dirname,
      env: env || process.env,
    })
    let stdout = ''
    proc.stdout.on('data', d => { stdout += d; process.stdout.write(d) })
    proc.stderr.on('data', d => process.stderr.write(d))
    proc.on('close', code => {
      const tag = scriptName.includes('matchup') ? '[MATCHUP_RESULT]'
        : scriptName.includes('followup') ? '[FOLLOWUP_RESULT]'
        : '[APPOINTMENT_RESULT]'
      const line = stdout.split('\n').find(l => l.includes(tag))
      if (line) {
        try { resolve({ ok: true, ...JSON.parse(line.replace(tag, '').trim()) }) }
        catch { resolve({ ok: false, error: 'Failed to parse result' }) }
      } else {
        resolve({ ok: code === 0, error: code !== 0 ? `Script exited ${code}` : null })
      }
    })
  })
}

async function processJob(job) {
  const d = job.request_data
  const { type, step, date, time, contact, phone, email, state, notes,
    happened, fna, secondAppt, referrals, bpm, edified, sale, ama,
    followupDate, followupTime, followupStep,
    prodProvider, prodProduct, prodPolicy, prodPoints, prodNotes, prodReferrals,
    bpmDate, bpmNote, bscproEmail, bscproPassword, zoomLink } = d

  const env = {
    ...process.env,
    ...(bscproEmail    && { BSC_PRO_EMAIL:    bscproEmail }),
    ...(bscproPassword && { BSC_PRO_PASSWORD: bscproPassword }),
    ...(zoomLink       && { ZOOM_LINK:        zoomLink }),
  }

  let scriptName, args

  if (type === 'followup') {
    scriptName = 'bsc_followup.js'
    args = [
      '--contact',     contact,
      '--happened',    happened     || 'yes',
      '--fna',         fna          || 'no',
      '--second-appt', secondAppt   || 'no',
      '--referrals',   referrals    || 'no',
      '--bpm',         bpm          || 'no',
      '--sale',        sale         || 'not-yet',
      '--ama',         ama          || 'no',
      '--submit',
    ]
    if (edified) args.push('--edified', edified)
    if (secondAppt === 'yes' && followupDate && followupTime) {
      args.push('--followup-date', `${followupDate} ${followupTime}`)
      args.push('--followup-step', followupStep || 'Step 2')
    }
    if (bpm === 'yes' && bpmDate) {
      args.push('--bpm-date', bpmDate)
      if (bpmNote) args.push('--bpm-note', bpmNote)
    }
    if (sale === 'yes') {
      if (prodProvider)  args.push('--prod-provider',  prodProvider)
      if (prodProduct)   args.push('--prod-product',   prodProduct)
      if (prodPolicy)    args.push('--prod-policy',    prodPolicy)
      if (prodPoints)    args.push('--prod-points',    prodPoints)
      if (prodNotes)     args.push('--prod-notes',     prodNotes)
      if (prodReferrals) args.push('--prod-referrals', prodReferrals)
    }
  } else {
    scriptName = type === 'matchup' ? 'bsc_matchup.js' : 'bsc_personal_appointment.js'
    args = [
      '--date',           `${date} ${time}`,
      '--duration',       '30',
      '--type-value',     getTagValue(step),
      '--contact',        contact,
      '--prospect-state', state || 'California',
      '--notes',          notes || '',
      '--submit',
    ]
    if (phone) args.push('--phone', phone)
    if (email) args.push('--email', email)
  }

  return runScript(scriptName, args, env)
}

let busy = false

async function poll() {
  if (busy) return
  busy = true
  try {
    const job = await claimJob()
    if (!job) return
    console.log(`[worker] Job ${job.id} — ${job.request_data?.type} for "${job.request_data?.contact}"`)
    try {
      const result = await processJob(job)
      if (result.ok) {
        await completeJob(job.id, result)
        console.log(`[worker] Job ${job.id} complete`)
      } else {
        await failJob(job.id, result.error || 'Script failed')
        console.error(`[worker] Job ${job.id} failed: ${result.error}`)
      }
    } catch (e) {
      await failJob(job.id, e.message)
      console.error(`[worker] Job ${job.id} exception: ${e.message}`)
    }
  } catch (e) {
    console.error('[worker] Poll error:', e.message)
  } finally {
    busy = false
  }
}

console.log(`[worker] Started — polling every ${POLL_MS / 1000}s`)
setInterval(poll, POLL_MS)
poll()
