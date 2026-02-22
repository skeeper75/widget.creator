const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = '/home/innojini/dev/widget.creator/.moai/knowledge/wowpress-devshop-analysis';
const SCREENSHOTS = path.join(BASE, 'screenshots');
const SESSION = path.join(BASE, 'session-state.json');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: SESSION,
    viewport: { width: 1920, height: 1080 },
    locale: 'ko-KR'
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  try {
    // First check if session is still valid
    console.log('=== Checking session state ===');
    await page.goto('https://devshop.wowpress.co.kr/maint', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    // If redirected to login, re-login
    if (currentUrl.includes('loginform') || currentUrl.includes('login')) {
      console.log('Session expired, re-logging in...');
      await page.fill('#authUid', 'innojini');
      await page.fill('#authPw', 'printly0416!@');
      const signInBtn = await page.$('button[type="submit"], button:has-text("Sign in"), input[type="submit"]');
      if (signInBtn) {
        await signInBtn.click();
      } else {
        await page.keyboard.press('Enter');
      }
      await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
      await page.waitForTimeout(3000);
      console.log('After re-login URL:', page.url());
    }

    // Take screenshot of main maint page
    await page.screenshot({ path: path.join(SCREENSHOTS, '10-maint-main.png'), fullPage: true });
    console.log('Maint page title:', await page.title());

    // Get the full HTML structure for analysis
    const bodyHTML = await page.evaluate(() => document.body.outerHTML);
    fs.writeFileSync(path.join(BASE, 'maint-main-body.html'), bodyHTML);
    console.log('Saved maint body HTML, length:', bodyHTML.length);

    // Get ALL links on the page
    const allLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({
        text: a.textContent.trim().substring(0, 100),
        href: a.href,
        class: a.className,
        parent: a.parentElement ? a.parentElement.tagName + '.' + a.parentElement.className.substring(0, 50) : ''
      })).filter(l => l.href && !l.href.startsWith('javascript:') && l.href !== '#');
    });
    console.log('Total links found:', allLinks.length);
    fs.writeFileSync(path.join(BASE, 'all-links.json'), JSON.stringify(allLinks, null, 2));

    // Get navigation menus specifically
    const navStructure = await page.evaluate(() => {
      // Try sidebar nav
      const sidebar = document.querySelector('.sidebar, .nav, #sidebar, .left-menu, .menu, aside');
      if (sidebar) {
        return {
          type: 'sidebar',
          html: sidebar.outerHTML.substring(0, 10000),
          links: Array.from(sidebar.querySelectorAll('a')).map(a => ({
            text: a.textContent.trim(),
            href: a.href,
            class: a.className,
            depth: 0
          }))
        };
      }

      // Try top nav
      const nav = document.querySelector('nav, .navbar, .header-nav, .top-menu');
      if (nav) {
        return {
          type: 'nav',
          html: nav.outerHTML.substring(0, 10000),
          links: Array.from(nav.querySelectorAll('a')).map(a => ({
            text: a.textContent.trim(),
            href: a.href,
            class: a.className,
            depth: 0
          }))
        };
      }

      // Try any list-based navigation
      const lists = document.querySelectorAll('ul');
      const navLists = Array.from(lists).filter(ul => {
        const links = ul.querySelectorAll('a');
        return links.length > 3;
      });
      if (navLists.length > 0) {
        const mainNav = navLists[0];
        return {
          type: 'list',
          html: mainNav.outerHTML.substring(0, 10000),
          links: Array.from(mainNav.querySelectorAll('a')).map(a => ({
            text: a.textContent.trim(),
            href: a.href
          }))
        };
      }

      return { type: 'none', html: '', links: [] };
    });
    console.log('Navigation type:', navStructure.type);
    console.log('Nav links count:', navStructure.links.length);
    if (navStructure.links.length > 0) {
      navStructure.links.forEach(l => console.log('  -', l.text, '=>', l.href));
    }

    // Get page text content for overview
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('Page text (first 3000 chars):\n', pageText.substring(0, 3000));

    // Try to find iframe or other navigation patterns
    const iframes = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('iframe')).map(f => ({
        src: f.src,
        id: f.id,
        name: f.name,
        width: f.width,
        height: f.height
      }));
    });
    console.log('Iframes:', JSON.stringify(iframes, null, 2));

    // Get all unique internal URLs
    const uniqueUrls = [...new Set(allLinks
      .filter(l => l.href.includes('devshop.wowpress.co.kr'))
      .map(l => l.href))];
    console.log('\nUnique internal URLs:');
    uniqueUrls.forEach(u => console.log('  ', u));

    // Try to navigate through main sections and screenshot each
    const urlsToVisit = uniqueUrls.filter(u => !u.includes('#') && !u.includes('loginform')).slice(0, 30);
    console.log('\n=== Visiting pages ===');

    for (let i = 0; i < urlsToVisit.length; i++) {
      const url = urlsToVisit[i];
      const pageName = url.replace('https://devshop.wowpress.co.kr/', '').replace(/\//g, '-') || 'root';
      try {
        console.log(`\nVisiting [${i+1}/${urlsToVisit.length}]: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);

        // Check if redirected to login
        if (page.url().includes('loginform')) {
          console.log('  Redirected to login, skipping');
          continue;
        }

        const title = await page.title();
        const textPreview = await page.evaluate(() => document.body.innerText.substring(0, 300));
        console.log('  Title:', title);
        console.log('  Preview:', textPreview.substring(0, 200));

        await page.screenshot({
          path: path.join(SCREENSHOTS, `page-${pageName.substring(0, 50)}.png`),
          fullPage: true
        });
      } catch (e) {
        console.log(`  Error visiting ${url}:`, e.message.substring(0, 100));
      }
    }

    // Save session state
    await context.storageState({ path: SESSION });
    console.log('\nSession state updated');

  } catch (err) {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
    await page.screenshot({ path: path.join(SCREENSHOTS, 'error-explore.png'), fullPage: true }).catch(() => {});
  }

  await browser.close();
})();
