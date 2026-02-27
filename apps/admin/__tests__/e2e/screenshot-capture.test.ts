/**
 * Screenshot Capture Test for SPEC-WA-001 Admin Pages
 *
 * Captures screenshots of all 6 wizard steps in full-page mode.
 * Saves to: apps/admin/__tests__/e2e/screenshots/
 *
 * Run with headed mode:
 *   PLAYWRIGHT_BASE_URL=http://192.168.45.19:3001 npx playwright test screenshot-capture.test.ts --headed
 */

import { test, expect, type Page, type BrowserContext } from 'playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// ─── Constants ──────────────────────────────────────────────────────────────

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://192.168.45.19:3001';
const ADMIN_EMAIL = 'admin@huniprinting.com';
const ADMIN_PASSWORD = 'admin123!';
const SCREENSHOTS_DIR = path.join(
  process.cwd(),
  'apps/admin/__tests__/e2e/screenshots'
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

// @MX:NOTE: [AUTO] Admin login helper - performs full NextAuth credential flow via form submission
// @MX:SPEC: SPEC-WA-001 REQ-E2E-AUTH
async function loginAsAdmin(page: Page): Promise<void> {
  console.log('테스트 시작: 관리자 로그인');
  await page.goto(`${BASE_URL}/login`);

  await page.waitForSelector('input[name="email"], input[type="email"]', {
    timeout: 10000,
  });

  const emailInput = page.locator('input[name="email"], input[type="email"]').first();
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
  const submitButton = page.locator('button[type="submit"]').first();

  await emailInput.fill(ADMIN_EMAIL);
  await passwordInput.fill(ADMIN_PASSWORD);
  await submitButton.click();

  await page.waitForURL(/\/widget-admin|\/dashboard/, { timeout: 10000 });
  console.log('로그인 완료');
}

// @MX:WARN: [AUTO] Screenshot capture relies on implicit timing - caller must ensure page is fully loaded before calling
// @MX:REASON: No explicit wait for dynamic content; upstream tests use waitForLoadState + waitForTimeout which may be insufficient for slow networks
async function captureScreenshot(page: Page, filename: string): Promise<void> {
  const screenshotPath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
  });
  console.log(`스크린샷 저장: ${screenshotPath}`);
}

// @MX:ANCHOR: [AUTO] Product ID discovery for all product-scoped test cases - every wizard step test depends on this
// @MX:REASON: fan_in >= 5; all step tests (02 through 06) skip if this returns null, making it a critical test prerequisite
// @MX:SPEC: SPEC-WA-001
async function getTestProductId(page: Page): Promise<number | null> {
  await page.goto(`${BASE_URL}/widget-admin`);
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await page.waitForTimeout(2000);

  const optionsLink = page
    .locator('a[href*="/widget-admin/"]')
    .filter({ hasText: '옵션' })
    .first();

  if (!(await optionsLink.isVisible({ timeout: 5000 }).catch(() => false))) {
    return null;
  }

  const href = await optionsLink.getAttribute('href');
  if (!href) return null;

  const match = /\/widget-admin\/(\d+)\/options/.exec(href);
  return match ? parseInt(match[1], 10) : null;
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

test.describe('SPEC-WA-001: Screenshot Capture', () => {
  let context: BrowserContext;
  let page: Page;
  let testProductId: number | null = null;

  test.beforeAll(async ({ browser }) => {
    // Ensure screenshots directory exists
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }

    context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    page = await context.newPage();
    await loginAsAdmin(page);
    testProductId = await getTestProductId(page);
    console.log(`테스트 상품 ID: ${testProductId}`);
  });

  test.afterAll(async () => {
    await context.close();
  });

  // @MX:ANCHOR: [AUTO] Dashboard screenshot - baseline visual test for SPEC-WA-001 admin UI validation
  // @MX:REASON: Referenced by CI visual regression checks and SPEC acceptance criteria screenshots
  // @MX:SPEC: SPEC-WA-001 REQ-U-001
  test('01-dashboard: Dashboard 메인 페이지 스크린샷', async () => {
    console.log('테스트 시작: Dashboard 페이지');
    await page.goto(`${BASE_URL}/widget-admin`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // @MX:WARN: [AUTO] Timing-sensitive: waitForFunction polls DOM by CSS class substring - fragile if class names change
    // @MX:REASON: Relies on text-3xl class being present in stat cards; refactoring CSS classes may silently break this guard
    // Wait for stat cards to load
    await page.waitForFunction(() => {
      const cards = document.querySelectorAll('[class*="text-3xl"]');
      return cards.length > 0;
    }, { timeout: 10000 }).catch(() => null);

    await page.waitForTimeout(1000);
    await captureScreenshot(page, '01-dashboard.png');
    console.log('스크린샷 저장: 01-dashboard.png');
  });

  test('02-options: 옵션 설정 페이지 스크린샷', async () => {
    if (!testProductId) {
      console.log('testProductId 없음 - 테스트 스킵');
      test.skip();
      return;
    }

    console.log(`테스트 시작: Options 페이지 (product ID: ${testProductId})`);
    await page.goto(`${BASE_URL}/widget-admin/${testProductId}/options`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(2000);

    await captureScreenshot(page, '02-options-page.png');
    console.log('스크린샷 저장: 02-options-page.png');
  });

  test('03-constraints: 제약조건 페이지 스크린샷', async () => {
    if (!testProductId) {
      console.log('testProductId 없음 - 테스트 스킵');
      test.skip();
      return;
    }

    console.log(`테스트 시작: Constraints 페이지 (product ID: ${testProductId})`);
    await page.goto(`${BASE_URL}/widget-admin/${testProductId}/constraints`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(2000);

    await captureScreenshot(page, '03-constraints-page.png');
    console.log('스크린샷 저장: 03-constraints-page.png');
  });

  test('04-pricing: 가격 설정 페이지 스크린샷', async () => {
    if (!testProductId) {
      console.log('testProductId 없음 - 테스트 스킵');
      test.skip();
      return;
    }

    console.log(`테스트 시작: Pricing 페이지 (product ID: ${testProductId})`);
    await page.goto(`${BASE_URL}/widget-admin/${testProductId}/pricing`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(2000);

    await captureScreenshot(page, '04-pricing-page.png');
    console.log('스크린샷 저장: 04-pricing-page.png');
  });

  test('05-simulation: 시뮬레이션 페이지 스크린샷', async () => {
    if (!testProductId) {
      console.log('testProductId 없음 - 테스트 스킵');
      test.skip();
      return;
    }

    console.log(`테스트 시작: Simulation 페이지 (product ID: ${testProductId})`);
    await page.goto(`${BASE_URL}/widget-admin/${testProductId}/simulate`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(2000);

    await captureScreenshot(page, '05-simulation-page.png');
    console.log('스크린샷 저장: 05-simulation-page.png');
  });

  test('06-publish: 퍼블리시 페이지 스크린샷', async () => {
    if (!testProductId) {
      console.log('testProductId 없음 - 테스트 스킵');
      test.skip();
      return;
    }

    console.log(`테스트 시작: Publish 페이지 (product ID: ${testProductId})`);
    await page.goto(`${BASE_URL}/widget-admin/${testProductId}/publish`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(3000);

    await captureScreenshot(page, '06-publish-page.png');
    console.log('스크린샷 저장: 06-publish-page.png');
  });
});
