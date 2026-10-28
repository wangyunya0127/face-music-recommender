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
  page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE.ERR: ' + m.text()) })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 3500)) // 等模型/曲库初始化

  const mount = await page.evaluate(() => ({
    hasApp: !!document.querySelector('.app'),
    tabs: document.querySelectorAll('.tabs button').length,
    demoFaces: document.querySelectorAll('.demo-face').length,
    status: (document.querySelector('.status') || {}).textContent || '',
  }))

  // 1) 切换标签到“打开视频”
  const tabSwitch = await page.evaluate(() => {
    const t = document.querySelectorAll('.tabs button')
    if (!t[1]) return 'no-tab'
    t[1].click()
    return t[1].className
  })
  await new Promise((r) => setTimeout(r, 300))

  // 2) 打开“算法说明”
  const algo = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('算法说明'))
    if (!b) return 'no-btn'
    b.click()
    return document.querySelector('.algo-modal') ? 'opened' : 'not-open'
  })
  await new Promise((r) => setTimeout(r, 300))
  // 关闭弹窗
  await page.evaluate(() => {
    const c = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('关闭') || x.textContent.trim() === '✕')
    if (c) c.click()
  })

  // 3) 点击第一张演示人脸，验证识别链路
  let detect = 'skipped'
  const hasFace = await page.evaluate(() => !!document.querySelector('.demo-face'))
  if (hasFace) {
    await page.evaluate(() => document.querySelector('.demo-face').click())
    // 等待检测（模型加载 + 推理 + 推荐）
    await new Promise((r) => setTimeout(r, 6000))
    detect = await page.evaluate(() => {
      const top = document.querySelector('.emotion-top') || document.querySelector('.top-emotion')
      const songs = document.querySelectorAll('.song-item, .song-card, li.song').length
      const status = (document.querySelector('.status') || {}).textContent || ''
      return { topText: top ? top.textContent.trim() : '(none)', songCount: songs, status }
    })
  }

  console.log('MOUNT:', JSON.stringify(mount))
  console.log('TAB[1] after click class:', JSON.stringify(tabSwitch))
  console.log('ALGO modal:', algo)
  console.log('DEMO FACE detect result:', JSON.stringify(detect))
  console.log('ERRORS:', errs.length ? errs.join('\n') : '(none)')
  await browser.close()
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
