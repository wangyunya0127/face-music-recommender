const puppeteer = require('puppeteer-core')
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://127.0.0.1:59431/static-html/847d6d5ff7ea7b83/index.html'
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox'] })
  const page = await browser.newPage()
  const errs = []
  page.on('pageerror', e => errs.push('PAGEERR: '+e.message))
  page.on('console', m => { if (m.type()==='error' && !/favicon/.test(m.text())) errs.push('CERR: '+m.text()) })
  await page.goto(URL, { waitUntil:'networkidle2', timeout:30000 })
  await new Promise(r=>setTimeout(r,3500))
  const m = await page.evaluate(()=>({ hasApp: !!document.querySelector('.app'), cards: document.querySelectorAll('.card-title').length, faceBtns: document.querySelectorAll('.face-btn').length, status: (document.querySelector('.status')||{}).textContent||'' }))
  // 点演示人脸(happy)
  await page.evaluate(()=>document.querySelectorAll('.face-btn')[1].click())
  await new Promise(r=>setTimeout(r,8000))
  const d = await page.evaluate(()=>({ emo:(document.querySelector('.emo-name')||{}).textContent||'', va:(document.querySelector('.va-coord')||{}).textContent||'' }))
  console.log('SNAP MOUNT:', JSON.stringify(m))
  console.log('SNAP DEMO HAPPY:', JSON.stringify(d))
  console.log('ERRORS:', errs.length?errs.join('\n'):'(none)')
  await browser.close()
})().catch(e=>{console.error('FATAL',e);process.exit(1)})
