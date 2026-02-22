const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS = '/home/innojini/dev/widget.creator/.moai/knowledge/wowpress-devshop-analysis/screenshots';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'ko-KR'
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  try {
    // Step 1: Go to wowpress.co.kr
    console.log('=== Step 1: Navigate to wowpress.co.kr ===');
    await page.goto('https://wowpress.co.kr', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOTS, '01-wowpress-main.png'), fullPage: true });
    console.log('Current URL:', page.url());
    console.log('Title:', await page.title());

    // Look for login link/button
    const loginLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links.filter(a => {
        const text = a.textContent.toLowerCase();
        const href = (a.href || '').toLowerCase();
        return text.includes('로그인') || text.includes('login') || text.includes('sign in') ||
               href.includes('login') || href.includes('signin') || href.includes('member');
      }).map(a => ({ text: a.textContent.trim().substring(0, 50), href: a.href }));
    });
    console.log('Login links found:', JSON.stringify(loginLinks, null, 2));

    // Try to find and click login
    if (loginLinks.length > 0) {
      console.log('Navigating to login link:', loginLinks[0].href);
      await page.goto(loginLinks[0].href, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(2000);
    } else {
      // Try common login URLs
      const loginUrls = [
        'https://wowpress.co.kr/login',
        'https://wowpress.co.kr/member/login',
        'https://wowpress.co.kr/bbs/login.php',
      ];
      for (const url of loginUrls) {
        try {
          console.log('Trying login URL:', url);
          const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
          if (resp && resp.status() < 400) {
            console.log('Found login page at:', url);
            await page.waitForTimeout(2000);
            break;
          }
        } catch (e) {
          console.log('  Failed:', e.message.substring(0, 100));
        }
      }
    }

    await page.screenshot({ path: path.join(SCREENSHOTS, '02-login-page.png'), fullPage: true });
    console.log('Login page URL:', page.url());

    // Debug: get full page HTML structure (abbreviated)
    const pageHTML = await page.evaluate(() => {
      return document.documentElement.outerHTML.substring(0, 5000);
    });
    console.log('Page HTML (first 2000):', pageHTML.substring(0, 2000));

    // Look for login form
    const formInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const inputs = Array.from(document.querySelectorAll('input'));
      return {
        forms: forms.map(f => ({
          action: f.action,
          method: f.method,
          id: f.id,
          class: f.className,
          html: f.outerHTML.substring(0, 500)
        })),
        inputs: inputs.map(i => ({
          type: i.type,
          name: i.name,
          id: i.id,
          placeholder: i.placeholder
        }))
      };
    });
    console.log('Forms:', JSON.stringify(formInfo, null, 2));

    // Try to fill login form
    const usernameSelectors = ['input[name="mb_id"]', 'input[name="user_id"]', 'input[name="username"]', 'input[name="id"]', '#login_id', '#mb_id', 'input[type="text"]:first-of-type'];
    const passwordSelectors = ['input[name="mb_password"]', 'input[name="password"]', 'input[name="passwd"]', 'input[name="user_pw"]', 'input[type="password"]', '#login_pw', '#mb_password'];

    let usernameField = null;
    for (const sel of usernameSelectors) {
      try {
        const el = await page.$(sel);
        if (el && await el.isVisible()) {
          usernameField = sel;
          console.log('Found username field:', sel);
          break;
        }
      } catch (e) {}
    }

    let passwordField = null;
    for (const sel of passwordSelectors) {
      try {
        const el = await page.$(sel);
        if (el && await el.isVisible()) {
          passwordField = sel;
          console.log('Found password field:', sel);
          break;
        }
      } catch (e) {}
    }

    if (usernameField && passwordField) {
      await page.fill(usernameField, 'innojini');
      await page.fill(passwordField, 'printly0416!@');
      await page.screenshot({ path: path.join(SCREENSHOTS, '03-login-filled.png'), fullPage: true });

      // Find and click submit button
      const submitBtn = await page.$('button[type="submit"], input[type="submit"], .btn_submit, .login_btn');
      if (submitBtn) {
        console.log('Clicking submit button');
        await submitBtn.click();
      } else {
        console.log('No submit button found, pressing Enter');
        await page.keyboard.press('Enter');
      }

      await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(SCREENSHOTS, '04-after-login.png'), fullPage: true });
      console.log('After login URL:', page.url());
      const afterLoginContent = await page.evaluate(() => document.body.innerText.substring(0, 1000));
      console.log('After login content:', afterLoginContent.substring(0, 500));
    } else {
      console.log('Could not find login form fields');
    }

    // Save cookies
    const cookies = await context.cookies();
    fs.writeFileSync(path.join(SCREENSHOTS, '..', 'cookies-wowpress.json'), JSON.stringify(cookies, null, 2));
    console.log('Saved', cookies.length, 'cookies');

    // Step 2: Try devshop.wowpress.co.kr/maint directly
    console.log('\n=== Step 2: Navigate to devshop.wowpress.co.kr ===');
    await page.goto('https://devshop.wowpress.co.kr', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOTS, '05-devshop-main.png'), fullPage: true });
    console.log('Devshop main URL:', page.url());
    console.log('Devshop main Title:', await page.title());

    const devshopContent = await page.evaluate(() => document.body.innerText.substring(0, 2000));
    console.log('Devshop content:', devshopContent.substring(0, 500));

    // Try /maint
    console.log('\n=== Step 3: Navigate to devshop.wowpress.co.kr/maint ===');
    await page.goto('https://devshop.wowpress.co.kr/maint', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOTS, '06-devshop-maint.png'), fullPage: true });
    console.log('Maint URL:', page.url());
    console.log('Maint Title:', await page.title());

    const maintContent = await page.evaluate(() => document.body.innerText.substring(0, 3000));
    console.log('Maint content:', maintContent.substring(0, 1000));

    // Check if maint page has login form
    const maintFormInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const inputs = Array.from(document.querySelectorAll('input'));
      return {
        forms: forms.map(f => ({ action: f.action, method: f.method, id: f.id, html: f.outerHTML.substring(0, 300) })),
        inputs: inputs.map(i => ({ type: i.type, name: i.name, id: i.id, placeholder: i.placeholder, value: i.type !== 'password' ? i.value : '***' }))
      };
    });
    console.log('Maint forms:', JSON.stringify(maintFormInfo, null, 2));

    // Try login on maint if needed
    const hasPasswordField = await page.$('input[type="password"]');
    if (hasPasswordField) {
      console.log('Maint has password field, trying login...');

      for (const sel of usernameSelectors) {
        const el = await page.$(sel);
        if (el) {
          await page.fill(sel, 'innojini');
          console.log('Filled maint username:', sel);
          break;
        }
      }
      for (const sel of passwordSelectors) {
        const el = await page.$(sel);
        if (el) {
          await page.fill(sel, 'printly0416!@');
          console.log('Filled maint password:', sel);
          break;
        }
      }

      const btn = await page.$('button[type="submit"], input[type="submit"], .btn_submit, button:has-text("로그인"), a.btn');
      if (btn) {
        await btn.click();
      } else {
        await page.keyboard.press('Enter');
      }
      await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(SCREENSHOTS, '07-maint-after-login.png'), fullPage: true });
      console.log('After maint login URL:', page.url());
    }

    // Save session state
    await context.storageState({ path: '/home/innojini/dev/widget.creator/.moai/knowledge/wowpress-devshop-analysis/session-state.json' });
    console.log('Session state saved');

    // Get navigation structure
    const navInfo = await page.evaluate(() => {
      const navLinks = Array.from(document.querySelectorAll('nav a, .gnb a, .lnb a, .menu a, .sidebar a, #menu a, #nav a, .header a'));
      return navLinks.map(a => ({
        text: a.textContent.trim().substring(0, 100),
        href: a.href,
        class: a.className
      })).filter(l => l.text.length > 0);
    });
    console.log('Navigation links:', JSON.stringify(navInfo, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
    await page.screenshot({ path: path.join(SCREENSHOTS, 'error-login.png'), fullPage: true }).catch(() => {});
  }

  await browser.close();
})();
