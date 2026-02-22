const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = '/home/innojini/dev/widget.creator/.moai/knowledge/wowpress-devshop-analysis';
const SCREENSHOTS = path.join(BASE, 'screenshots');
const NETWORK_LOGS = path.join(BASE, 'network-logs');
const SESSION = path.join(BASE, 'session-state.json');

// Products to analyze deeply - diverse categories
const PRODUCTS = [
  { id: '40073', name: '일반명함', category: '명함' },
  { id: '40008', name: '가성비스티커(도무송)', category: '스티커' },
  { id: '40026', name: '합판전단', category: '전단' },
  { id: '40196', name: '무선책자', category: '책자' },
  { id: '40054', name: '독판전단', category: '전단' },
  { id: '40023', name: '아크릴보드', category: '사인제품' },
  { id: '40468', name: '반팔T-프린트스타(17수)', category: '어패럴' },
  { id: '40038', name: '상품권/티켓', category: '행택/쿠폰/안내장' },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: SESSION,
    viewport: { width: 1920, height: 1080 },
    locale: 'ko-KR'
  });

  const allProductData = [];

  for (const product of PRODUCTS) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Analyzing: ${product.name} (${product.id}) - ${product.category}`);
    console.log('='.repeat(80));

    const page = await context.newPage();
    page.setDefaultTimeout(30000);

    // Collect network requests
    const networkRequests = [];
    page.on('request', req => {
      const url = req.url();
      if (url.includes('devshop.wowpress.co.kr') && !url.includes('.png') && !url.includes('.jpg') && !url.includes('.css') && !url.includes('.js') && !url.includes('.ico') && !url.includes('.woff')) {
        networkRequests.push({
          url: url,
          method: req.method(),
          postData: req.postData() || null,
          headers: Object.fromEntries(Object.entries(req.headers()).filter(([k]) => ['content-type', 'accept', 'x-requested-with'].includes(k))),
          timestamp: Date.now()
        });
      }
    });

    page.on('response', async resp => {
      const url = resp.url();
      if (url.includes('devshop.wowpress.co.kr') && !url.includes('.png') && !url.includes('.jpg') && !url.includes('.css') && !url.includes('.js') && !url.includes('.ico') && !url.includes('.woff')) {
        const reqEntry = networkRequests.find(r => r.url === url && !r.response);
        if (reqEntry) {
          try {
            const body = await resp.text();
            reqEntry.response = {
              status: resp.status(),
              headers: resp.headers(),
              body: body.substring(0, 5000)
            };
          } catch (e) {
            reqEntry.response = { status: resp.status(), error: e.message };
          }
        }
      }
    });

    try {
      await page.goto(`https://devshop.wowpress.co.kr/prodt/${product.id}`, {
        waitUntil: 'domcontentloaded', timeout: 60000
      });
      await page.waitForTimeout(3000);

      // Check if login redirect
      if (page.url().includes('loginform')) {
        console.log('Session expired, re-logging in...');
        await page.fill('#authUid', 'innojini');
        await page.fill('#authPw', 'printly0416!@');
        await page.keyboard.press('Enter');
        await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
        await page.waitForTimeout(2000);
        await page.goto(`https://devshop.wowpress.co.kr/prodt/${product.id}`, {
          waitUntil: 'domcontentloaded', timeout: 60000
        });
        await page.waitForTimeout(3000);
      }

      // Full page screenshot
      await page.screenshot({
        path: path.join(SCREENSHOTS, `product-${product.id}-full.png`),
        fullPage: true
      });

      // === Extract complete page structure ===
      const productData = await page.evaluate((prodId) => {
        const data = {
          productId: prodId,
          pageTitle: document.title,
          breadcrumb: [],
          sections: [],
          allSelectElements: [],
          allInputElements: [],
          allButtons: [],
          formStructure: [],
          jsVariables: {},
          scriptTags: []
        };

        // Extract all SELECT elements with their options
        document.querySelectorAll('select').forEach(sel => {
          const options = Array.from(sel.options).map(opt => ({
            value: opt.value,
            text: opt.text.trim(),
            selected: opt.selected,
            disabled: opt.disabled,
            dataAttrs: Object.fromEntries(
              Array.from(opt.attributes)
                .filter(a => a.name.startsWith('data-'))
                .map(a => [a.name, a.value])
            )
          }));

          data.allSelectElements.push({
            name: sel.name,
            id: sel.id,
            class: sel.className,
            options: options,
            selectedValue: sel.value,
            disabled: sel.disabled,
            parentText: sel.parentElement ? sel.parentElement.textContent.trim().substring(0, 100) : '',
            dataAttrs: Object.fromEntries(
              Array.from(sel.attributes)
                .filter(a => a.name.startsWith('data-'))
                .map(a => [a.name, a.value])
            ),
            onchange: sel.getAttribute('onchange') || '',
            label: sel.previousElementSibling ? sel.previousElementSibling.textContent.trim().substring(0, 50) : ''
          });
        });

        // Extract all INPUT elements
        document.querySelectorAll('input').forEach(inp => {
          data.allInputElements.push({
            type: inp.type,
            name: inp.name,
            id: inp.id,
            value: inp.type !== 'password' ? inp.value : '***',
            placeholder: inp.placeholder,
            class: inp.className,
            disabled: inp.disabled,
            readOnly: inp.readOnly,
            dataAttrs: Object.fromEntries(
              Array.from(inp.attributes)
                .filter(a => a.name.startsWith('data-'))
                .map(a => [a.name, a.value])
            )
          });
        });

        // Extract all buttons
        document.querySelectorAll('button, input[type="button"], input[type="submit"], a.btn, .btn').forEach(btn => {
          data.allButtons.push({
            tag: btn.tagName,
            text: btn.textContent.trim().substring(0, 50),
            type: btn.type || '',
            onclick: btn.getAttribute('onclick') || '',
            class: btn.className,
            href: btn.href || ''
          });
        });

        // Extract form structure
        document.querySelectorAll('form').forEach(form => {
          data.formStructure.push({
            id: form.id,
            action: form.action,
            method: form.method,
            class: form.className,
            fieldCount: form.elements.length
          });
        });

        // Try to find pricing-related elements
        const priceElements = document.querySelectorAll('[class*="price"], [id*="price"], [class*="Price"], [id*="Price"], [class*="cost"], [id*="cost"], [class*="total"], [id*="total"], [class*="amount"], [id*="amount"]');
        data.priceElements = Array.from(priceElements).map(el => ({
          tag: el.tagName,
          id: el.id,
          class: el.className,
          text: el.textContent.trim().substring(0, 200)
        }));

        // Extract relevant inline scripts
        document.querySelectorAll('script').forEach(script => {
          const src = script.src;
          const content = script.textContent;
          if (!src && content.length > 10 && content.length < 50000) {
            // Check if it contains relevant keywords
            if (content.includes('option') || content.includes('price') ||
                content.includes('select') || content.includes('order') ||
                content.includes('ajax') || content.includes('fetch') ||
                content.includes('prodt') || content.includes('API') ||
                content.includes('단가') || content.includes('가격')) {
              data.scriptTags.push(content.substring(0, 10000));
            }
          } else if (src) {
            data.scriptTags.push(`[SRC] ${src}`);
          }
        });

        // Get page text content organized by sections
        const mainContent = document.querySelector('.content, .main, main, #content, .container');
        if (mainContent) {
          data.mainContentText = mainContent.innerText.substring(0, 5000);
        } else {
          data.mainContentText = document.body.innerText.substring(0, 5000);
        }

        // Look for table structures (common in admin pages)
        document.querySelectorAll('table').forEach((table, idx) => {
          const rows = Array.from(table.rows).map(row => {
            return Array.from(row.cells).map(cell => ({
              text: cell.textContent.trim().substring(0, 200),
              html: cell.innerHTML.substring(0, 500),
              colspan: cell.colSpan,
              rowspan: cell.rowSpan,
              hasSelect: cell.querySelector('select') !== null,
              hasInput: cell.querySelector('input') !== null
            }));
          });
          data.sections.push({
            type: 'table',
            index: idx,
            rows: rows.slice(0, 30),
            class: table.className,
            id: table.id
          });
        });

        return data;
      }, product.id);

      productData.productMeta = product;

      // === Now try interacting with options ===
      console.log(`\nFound ${productData.allSelectElements.length} select elements`);
      productData.allSelectElements.forEach(sel => {
        console.log(`  SELECT: name=${sel.name}, id=${sel.id}, options=${sel.options.length}, onchange=${sel.onchange.substring(0, 80)}`);
        sel.options.forEach(opt => {
          console.log(`    - value="${opt.value}" text="${opt.text}" ${opt.selected ? '[SELECTED]' : ''} ${opt.disabled ? '[DISABLED]' : ''}`);
        });
      });

      // Try selecting different options and observe changes
      const interactionResults = [];
      const selectElements = productData.allSelectElements.filter(s => s.options.length > 1);

      for (const selInfo of selectElements) {
        const selector = selInfo.id ? `#${selInfo.id}` : (selInfo.name ? `select[name="${selInfo.name}"]` : null);
        if (!selector) continue;

        console.log(`\n--- Interacting with: ${selector} (${selInfo.label || selInfo.parentText.substring(0, 30)}) ---`);

        for (const option of selInfo.options.slice(0, 5)) { // Test first 5 options
          if (!option.value || option.disabled) continue;

          const beforeRequests = networkRequests.length;

          try {
            await page.selectOption(selector, option.value);
            await page.waitForTimeout(1500); // Wait for AJAX

            const afterRequests = networkRequests.length;
            const newRequests = networkRequests.slice(beforeRequests);

            // Get updated state of all selects
            const updatedSelects = await page.evaluate(() => {
              return Array.from(document.querySelectorAll('select')).map(sel => ({
                name: sel.name,
                id: sel.id,
                value: sel.value,
                disabled: sel.disabled,
                optionCount: sel.options.length,
                options: Array.from(sel.options).map(o => ({
                  value: o.value,
                  text: o.text.trim(),
                  disabled: o.disabled,
                  selected: o.selected
                }))
              }));
            });

            // Get any price display changes
            const priceInfo = await page.evaluate(() => {
              const priceTexts = {};
              document.querySelectorAll('[class*="price"], [id*="price"], [class*="Price"], [id*="Price"], [class*="amount"], td, span, div').forEach(el => {
                const text = el.textContent.trim();
                if (text.match(/[\d,]+\s*원/) || text.match(/₩/) || text.match(/\d{3,}/)) {
                  const key = el.id || el.className || el.tagName;
                  priceTexts[key] = text.substring(0, 200);
                }
              });
              return priceTexts;
            });

            const interaction = {
              select: selector,
              optionSelected: option,
              newAjaxRequests: newRequests.map(r => ({
                url: r.url,
                method: r.method,
                postData: r.postData,
                responseStatus: r.response?.status,
                responseBody: r.response?.body?.substring(0, 2000)
              })),
              updatedSelects: updatedSelects,
              ajaxCount: newRequests.length
            };

            interactionResults.push(interaction);

            if (newRequests.length > 0) {
              console.log(`  Selected "${option.text}" -> ${newRequests.length} AJAX calls`);
              newRequests.forEach(r => {
                console.log(`    ${r.method} ${r.url.substring(0, 100)}`);
                if (r.postData) console.log(`    POST: ${r.postData.substring(0, 200)}`);
              });
            } else {
              console.log(`  Selected "${option.text}" -> No AJAX calls`);
            }
          } catch (e) {
            console.log(`  Error selecting "${option.text}":`, e.message.substring(0, 100));
          }
        }
      }

      productData.interactionResults = interactionResults;

      // Get the full page HTML for detailed analysis
      const fullHTML = await page.evaluate(() => document.documentElement.outerHTML);
      fs.writeFileSync(path.join(BASE, `product-${product.id}-full.html`), fullHTML);

      // Try clicking specific buttons
      console.log('\n--- Testing action buttons ---');
      const actionButtons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button, a.btn, .btn, a[onclick]')).map(b => ({
          text: b.textContent.trim().substring(0, 50),
          onclick: b.getAttribute('onclick') || '',
          href: b.href || '',
          class: b.className,
          id: b.id
        })).filter(b => b.text.length > 0);
      });
      productData.actionButtons = actionButtons;
      actionButtons.forEach(b => console.log(`  Button: "${b.text}" onclick=${b.onclick.substring(0, 80)}`));

      // Test "가격조회" (price inquiry) button
      const priceBtn = await page.$('button:has-text("가격조회"), a:has-text("가격조회"), *[onclick*="price"], *[onclick*="Price"], *[onclick*="단가"]');
      if (priceBtn) {
        console.log('\n--- Clicking Price Inquiry button ---');
        const beforePriceReqs = networkRequests.length;
        await priceBtn.click();
        await page.waitForTimeout(3000);
        const priceCalls = networkRequests.slice(beforePriceReqs);
        console.log(`  ${priceCalls.length} requests made`);
        priceCalls.forEach(r => {
          console.log(`    ${r.method} ${r.url.substring(0, 150)}`);
          if (r.postData) console.log(`    POST: ${r.postData.substring(0, 500)}`);
          if (r.response?.body) console.log(`    RESP: ${r.response.body.substring(0, 500)}`);
        });
        productData.priceInquiryRequests = priceCalls.map(r => ({
          url: r.url,
          method: r.method,
          postData: r.postData,
          responseStatus: r.response?.status,
          responseBody: r.response?.body?.substring(0, 3000)
        }));

        await page.screenshot({
          path: path.join(SCREENSHOTS, `product-${product.id}-after-price.png`),
          fullPage: true
        });

        // Get price display after inquiry
        const priceDisplay = await page.evaluate(() => {
          return document.body.innerText;
        });
        productData.afterPriceContent = priceDisplay.substring(0, 5000);
      }

      // Save network logs per product
      fs.writeFileSync(
        path.join(NETWORK_LOGS, `product-${product.id}-network.json`),
        JSON.stringify(networkRequests, null, 2)
      );

      // Save product data
      allProductData.push(productData);
      console.log(`\nTotal network requests for ${product.name}: ${networkRequests.length}`);

    } catch (err) {
      console.error(`Error analyzing ${product.name}:`, err.message);
      await page.screenshot({
        path: path.join(SCREENSHOTS, `error-product-${product.id}.png`),
        fullPage: true
      }).catch(() => {});
    }

    await page.close();
  }

  // Save all product data
  fs.writeFileSync(
    path.join(BASE, 'all-product-analysis.json'),
    JSON.stringify(allProductData, null, 2)
  );
  console.log('\n=== All product analysis saved ===');

  await browser.close();
})();
