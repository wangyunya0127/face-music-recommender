const puppeteer = require('puppeteer-core')
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URLS = [
  'http://127.0.0.1:59431/static-html/850c4f24541d2ebc/index.html',
  'http://127.0.0.1:4173/',
]
;(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  for (const url of URLS) {
    const page = await browser.newPage()
    await page.evaluateOnNewDocument(() => {
      window.__errs = []
      window.addEventListener('error', (e) => {
        window.__errs.push('ERROR: ' + (e.message || '') + ' @ ' + (e.filename || '') + ':' + (e.lineno || '') + '\n' + (e.error && e.error.stack ? e.error.stack : ''))
      })
      window.addEventListener('unhandledrejection', (e) => {
        const r = e.reason
        window.__errs.push('REJECTION: ' + (r && r.message ? r.message : String(r)) + '\n' + (r && r.stack ? r.stack : ''))
      })
      window.__logs = []
      const oc = console.error.bind(console)
      console.error = (...a) => { window.__logs.push('cerr: ' + a.map(x => (x && x.stack) ? x.stack : (x && x.message) ? x.message : String(x)).join(' ')); oc(...a) }
    })
    const responses = []
    page.on('response', (r) => { if (/assets\/|\.js|face-api|manifest/.test(r.url())) responses.push(`${r.status()} ${r.url()}`) })
    try { await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }) } catch (e) {}
    await new Promise((r) => setTimeout(r, 3000))
    const errs = await page.evaluate(() => ({ errs: window.__errs || [], logs: window.__logs || [], hasApp: !!document.querySelector('.app'), faceapi: typeof window.faceapi }))
    console.log('\n========== URL:', url, '==========')
    console.log('hasApp:', errs.hasApp, '| window.faceapi:', errs.faceapi)
    console.log('--- key responses ---')
    console.log(responses.join('\n') || '(none)')
    console.log('--- window errors ---')
    console.log(errs.errs.join('\n---\n') || '(none)')
    console.log('--- window console.error logs ---')
    console.log(errs.logs.join('\n') || '(none)')
    await page.close()
  }
  await browser.close()
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
