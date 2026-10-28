const puppeteer = require('puppeteer-core')
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://127.0.0.1:4173/'
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  const page = await browser.newPage()
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 3500))
  // 点击第2张演示人脸 = happy（index 1）
  await page.evaluate(() => document.querySelectorAll('.face-btn')[1].click())
  await new Promise((r) => setTimeout(r, 8000))
  const r = await page.evaluate(() => ({
    emoName: (document.querySelector('.emo-name') || {}).textContent || '(none)',
    conf: (document.querySelector('.conf') || {}).textContent || '',
    va: (document.querySelector('.va-coord') || {}).textContent || '',
    expected: (document.querySelector('.expected') || {}).textContent || '',
    songs: [...document.querySelectorAll('.song .title, .song-card .title, li.song .title')].slice(0, 4).map((e) => e.textContent.trim()),
  }))
  console.log('HAPPY FACE RESULT:', JSON.stringify(r))
  await browser.close()
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
