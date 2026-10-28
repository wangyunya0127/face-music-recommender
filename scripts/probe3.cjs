const puppeteer = require('puppeteer-core')
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://127.0.0.1:4173/'
;(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  })
  const page = await browser.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push('CONSOLE.ERR: ' + m.text()) })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 3500))

  const mount = await page.evaluate(() => ({
    cards: [...document.querySelectorAll('.card-title')].map((e) => e.textContent.trim()),
    faceBtns: document.querySelectorAll('.face-btn').length,
    status: (document.querySelector('.status') || {}).textContent || '',
  }))

  // 算法弹窗
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('算法说明')); b && b.click() })
  await new Promise((r) => setTimeout(r, 300))
  const modalOpen = await page.evaluate(() => !!document.querySelector('.overlay'))
  await page.evaluate(() => { const x = document.querySelector('.overlay .x'); x && x.click() })
  await new Promise((r) => setTimeout(r, 300))
  const modalClosed = await page.evaluate(() => !document.querySelector('.overlay'))

  // 标签切换
  const tabActive = await page.evaluate(() => {
    const t = document.querySelectorAll('.tabs button')
    t[1].click()
    return null
  })
  await new Promise((r) => setTimeout(r, 300))
  const activeTab = await page.evaluate(() => {
    const t = document.querySelectorAll('.tabs button')
    let idx = -1
    t.forEach((b, i) => { if (b.className.includes('active')) idx = i })
    return { activeIdx: idx, labels: [...t].map((b) => b.textContent.trim()) }
  })

  // 演示人脸：点击第一张（happy）
  await page.evaluate(() => { const f = document.querySelector('.face-btn'); f && f.click() })
  await new Promise((r) => setTimeout(r, 8000)) // 模型加载+推理+推荐
  const detect = await page.evaluate(() => ({
    emoName: (document.querySelector('.emo-name') || {}).textContent || '(none)',
    conf: (document.querySelector('.conf') || {}).textContent || '',
    va: (document.querySelector('.va-coord') || {}).textContent || '',
    expected: (document.querySelector('.expected') || {}).textContent || '',
    songCount: document.querySelectorAll('.song-item, .song-card, li.song, .song').length,
    firstSong: (document.querySelector('.song .title, .song-card .title, li.song .title') || {}).textContent || '',
    status: (document.querySelector('.status') || {}).textContent || '',
  }))

  console.log('CARDS:', JSON.stringify(mount.cards))
  console.log('FACE_BTNS:', mount.faceBtns, '| status:', mount.status)
  console.log('MODAL open/closed:', modalOpen, '/', modalClosed)
  console.log('ACTIVE TAB idx:', activeTab.activeIdx, '| labels:', JSON.stringify(activeTab.labels))
  console.log('DETECT:', JSON.stringify(detect))
  console.log('ERRORS:', errs.length ? errs.join('\n') : '(none)')
  await browser.close()
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
