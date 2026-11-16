import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import readline from 'node:readline'
import { chromium } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'
const AUTH_DIR = path.resolve(import.meta.dirname, '.auth')
const AUTH_FILE = path.join(AUTH_DIR, 'user.json')

async function isServerReady(url) {
  try {
    const res = await fetch(url)
    return res.ok
  } catch {
    return false
  }
}

async function waitForServer(url, timeoutMs = 30_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerReady(url)) return true
    await new Promise((r) => setTimeout(r, 400))
  }
  return false
}

async function main() {
  fs.mkdirSync(AUTH_DIR, { recursive: true })

  let viteProcess = null
  const alreadyRunning = await isServerReady(BASE_URL)
  if (!alreadyRunning) {
    console.log('[e2e:auth] Uruchamiam serwer deweloperski Vite na http://localhost:5173...')
    const isWin = process.platform === 'win32'
    viteProcess = spawn(isWin ? 'npm.cmd' : 'npm', ['run', 'dev'], {
      stdio: 'ignore',
      shell: isWin,
      detached: false,
    })
    const ready = await waitForServer(BASE_URL)
    if (!ready) {
      console.error('[e2e:auth] Nie udało się uruchomić Vite na http://localhost:5173.')
      viteProcess?.kill()
      process.exit(1)
    }
  }

  console.log('[e2e:auth] Otwieram Microsoft Edge...')
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  })

  const context = await browser.newContext({
    viewport: { width: 1280, height: 850 },
  })
  const page = await context.newPage()
  await page.goto(BASE_URL)

  console.log('')
  console.log('=================================================================')
  console.log('1. W otwartym oknie Microsoft Edge kliknij "Zaloguj się przez Google".')
  console.log('2. Dokończ logowanie, aż zobaczysz główny widok SmartShopping.')
  console.log('3. Po pojawieniu się aplikacji wciśnij ENTER tutaj w terminalu,')
  console.log('   aby zapisać sesję do e2e/.auth/user.json.')
  console.log('=================================================================')
  console.log('')

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  await new Promise((resolve) => {
    rl.question('Naciśnij ENTER po zalogowaniu w przeglądarce... ', () => {
      rl.close()
      resolve(undefined)
    })
  })

  await context.storageState({ path: AUTH_FILE })
  console.log(`[e2e:auth] Zapisano sesję uwierzytelniania do: ${AUTH_FILE}`)

  await browser.close()
  if (viteProcess) {
    viteProcess.kill()
  }
}

main().catch((err) => {
  console.error('[e2e:auth] Błąd:', err)
  process.exit(1)
})
