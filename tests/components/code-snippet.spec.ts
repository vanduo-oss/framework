/**
 * Code Snippet Component Tests
 *
 * Tests for js/components/code-snippet.js
 * Covers: initialization, copy button, tabs, expand/collapse, events
 */

import { test, expect } from '@playwright/test';

test.describe('Code Snippet Component @component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/fixtures/code-snippet.html');
    await page.waitForTimeout(100);
  });

  test.describe('Initialization', () => {
    test('initializes all code snippets', async ({ page }) => {
      const snippets = page.locator('.vd-code-snippet');
      await expect(snippets).toHaveCount(6);
    });

    test('marks snippets as initialized', async ({ page }) => {
      const snippet = page.locator('#basic-snippet');
      await expect(snippet).toHaveAttribute('data-initialized', 'true');
    });

    test('expanded snippet has visible content', async ({ page }) => {
      const snippet = page.locator('#basic-snippet');
      const content = snippet.locator('.vd-code-snippet-content');
      
      await expect(snippet).toHaveAttribute('data-expanded', 'true');
      await expect(content).toHaveAttribute('data-visible', 'true');
    });

    test('collapsed snippet has hidden content', async ({ page }) => {
      const snippet = page.locator('#collapsible-snippet');
      const content = snippet.locator('.vd-code-snippet-content');
      
      await expect(snippet).toHaveAttribute('data-expanded', 'false');
      await expect(content).toHaveAttribute('data-visible', 'false');
    });
  });

  test.describe('Copy Button', () => {
    test('copy button exists in snippets', async ({ page }) => {
      const copyButtons = page.locator('#basic-snippet .vd-code-snippet-copy');
      await expect(copyButtons).toHaveCount(1);
    });

    test('clicking copy button shows feedback', async ({ page, browserName }) => {
      // Clipboard permissions vary by browser
      test.skip(browserName !== 'chromium', 'Clipboard API behavior varies by browser');

      const copyButton = page.locator('#basic-snippet .vd-code-snippet-copy');
      
      // Grant clipboard permissions for the test
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      
      await copyButton.click();
      await page.waitForTimeout(100);

      // Button should get is-copied class temporarily
      await expect(copyButton).toHaveClass(/is-copied/);
    });

    test('copy button has correct aria-label', async ({ page }) => {
      const copyButton = page.locator('#basic-snippet .vd-code-snippet-copy');
      await expect(copyButton).toHaveAttribute('aria-label', 'Copy code');
    });
  });

  test.describe('Tab Navigation', () => {
    test('tab ids are unique across snippets and linked to panels', async ({ page }) => {
      const tabMeta = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.vd-code-snippet-tab')).map(tab => {
          const controls = tab.getAttribute('aria-controls');
          const panel = controls ? document.getElementById(controls) : null;
          return {
            id: tab.id,
            controls,
            panelExists: Boolean(panel),
            panelLabelledBy: panel ? panel.getAttribute('aria-labelledby') : null
          };
        });
      });

      const ids = tabMeta.map(item => item.id).filter(Boolean);
      expect(ids.length).toBeGreaterThan(0);
      expect(new Set(ids).size).toBe(ids.length);

      for (const item of tabMeta) {
        expect(item.id).toBeTruthy();
        expect(item.controls).toBeTruthy();
        expect(item.panelExists).toBe(true);
        expect(item.panelLabelledBy).toBe(item.id);
      }
    });

    test('tab list has correct role', async ({ page }) => {
      const tabList = page.locator('#tabbed-snippet .vd-code-snippet-tabs');
      await expect(tabList).toHaveAttribute('role', 'tablist');
    });

    test('tabs have correct attributes', async ({ page }) => {
      const activeTab = page.locator('#tabbed-snippet .vd-code-snippet-tab.is-active');
      
      await expect(activeTab).toHaveAttribute('role', 'tab');
      await expect(activeTab).toHaveAttribute('aria-selected', 'true');
    });

    test('inactive tabs have correct aria-selected', async ({ page }) => {
      const inactiveTab = page.locator('#tabbed-snippet .vd-code-snippet-tab').nth(1);
      
      await expect(inactiveTab).toHaveAttribute('aria-selected', 'false');
    });

    test('clicking tab switches to that language', async ({ page }) => {
      const cssTab = page.locator('#tabbed-snippet .vd-code-snippet-tab[data-lang="css"]');
      const cssPane = page.locator('#tabbed-snippet .vd-code-snippet-pane[data-lang="css"]');

      await cssTab.click();

      await expect(cssTab).toHaveClass(/is-active/);
      await expect(cssTab).toHaveAttribute('aria-selected', 'true');
      await expect(cssPane).toHaveClass(/is-active/);
    });

    test('switches active pane when tab is clicked', async ({ page }) => {
      const jsTab = page.locator('#tabbed-snippet .vd-code-snippet-tab[data-lang="js"]');
      const jsPane = page.locator('#tabbed-snippet .vd-code-snippet-pane[data-lang="js"]');
      const htmlPane = page.locator('#tabbed-snippet .vd-code-snippet-pane[data-lang="html"]');

      await jsTab.click();

      await expect(jsPane).toHaveClass(/is-active/);
      await expect(htmlPane).not.toHaveClass(/is-active/);
    });

    test('dispatches codesnippet:tabchange event', async ({ page }) => {
      await page.evaluate(() => {
        (window as any).tabChangeEvent = null;
        document.addEventListener('codesnippet:tabchange', (e: any) => {
          (window as any).tabChangeEvent = e.detail;
        });
      });

      await page.locator('#tabbed-snippet .vd-code-snippet-tab[data-lang="css"]').click();

      const eventDetail = await page.evaluate(() => (window as any).tabChangeEvent);
      expect(eventDetail).not.toBeNull();
      expect(eventDetail.lang).toBe('css');
    });

    test('keyboard navigation with ArrowRight', async ({ page }) => {
      const firstTab = page.locator('#tabbed-snippet .vd-code-snippet-tab').first();
      
      await firstTab.focus();
      await page.keyboard.press('ArrowRight');

      const secondTab = page.locator('#tabbed-snippet .vd-code-snippet-tab').nth(1);
      await expect(secondTab).toBeFocused();
    });

    test('keyboard navigation with ArrowLeft', async ({ page }) => {
      const tabs = page.locator('#tabbed-snippet .vd-code-snippet-tab');
      
      await tabs.nth(1).focus();
      await page.keyboard.press('ArrowLeft');

      await expect(tabs.first()).toBeFocused();
    });

    test('keyboard navigation with Home key', async ({ page }) => {
      const tabs = page.locator('#tabbed-snippet .vd-code-snippet-tab');
      
      await tabs.nth(2).focus();
      await page.keyboard.press('Home');

      await expect(tabs.first()).toBeFocused();
    });

    test('keyboard navigation with End key', async ({ page }) => {
      const tabs = page.locator('#tabbed-snippet .vd-code-snippet-tab');
      
      await tabs.first().focus();
      await page.keyboard.press('End');

      await expect(tabs.nth(2)).toBeFocused();
    });
  });

  test.describe('Collapsible Behavior', () => {
    test('collapsed snippet has correct initial state', async ({ page }) => {
      const snippet = page.locator('#collapsible-snippet');
      const toggle = snippet.locator('.vd-code-snippet-toggle');
      
      // Verify initial collapsed state
      await expect(snippet).toHaveAttribute('data-expanded', 'false');
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    test('expand method works programmatically', async ({ page }) => {
      await page.evaluate(() => {
        (window as any).CodeSnippet.expand('#collapsible-snippet');
      });

      const snippet = page.locator('#collapsible-snippet');
      await expect(snippet).toHaveAttribute('data-expanded', 'true');
    });

    test('collapse method works programmatically', async ({ page }) => {
      // First expand
      await page.evaluate(() => {
        (window as any).CodeSnippet.expand('#collapsible-snippet');
      });
      
      // Then collapse
      await page.evaluate(() => {
        (window as any).CodeSnippet.collapse('#collapsible-snippet');
      });

      const snippet = page.locator('#collapsible-snippet');
      await expect(snippet).toHaveAttribute('data-expanded', 'false');
    });

    test('expanded state changes after API call', async ({ page }) => {
      const snippet = page.locator('#collapsible-snippet');
      
      // Initially collapsed
      await expect(snippet).toHaveAttribute('data-expanded', 'false');
      
      // Expand via API
      await page.evaluate(() => {
        (window as any).CodeSnippet.expand('#collapsible-snippet');
      });

      // Should be expanded
      await expect(snippet).toHaveAttribute('data-expanded', 'true');
    });
  });

  test.describe('Line Numbers', () => {
    test('has line numbers container when has-line-numbers class present', async ({ page }) => {
      const pane = page.locator('#line-numbers-snippet .has-line-numbers');
      const lineNumbers = pane.locator('.vd-code-snippet-line-numbers');
      
      await expect(lineNumbers).toHaveCount(1);
    });

    test('line numbers have aria-hidden', async ({ page }) => {
      const lineNumbers = page.locator('#line-numbers-snippet .vd-code-snippet-line-numbers');
      await expect(lineNumbers).toHaveAttribute('aria-hidden', 'true');
    });

    test('wraps code using DOM node cloning (no string reinjection)', async ({ page }) => {
      const result = await page.evaluate(() => {
        const pane = document.querySelector('#line-numbers-snippet .has-line-numbers') as HTMLElement;
        const wrapper = pane?.querySelector('.vd-code-snippet-code');
        const code = wrapper?.querySelector('code');
        return {
          hasWrapper: Boolean(wrapper),
          hasCodeElement: Boolean(code),
          codeText: code?.textContent || '',
          scriptCount: wrapper?.querySelectorAll('script').length || 0,
          topLevelCodeCount: pane?.querySelectorAll(':scope > code').length || 0,
        };
      });

      expect(result.hasWrapper).toBe(true);
      expect(result.hasCodeElement).toBe(true);
      expect(result.codeText).toContain('function greet(name)');
      expect(result.scriptCount).toBe(0);
      expect(result.topLevelCodeCount).toBe(0);
    });
  });

  test.describe('Programmatic API', () => {
    test('CodeSnippet is exposed globally', async ({ page }) => {
      const exists = await page.evaluate(() => typeof (window as any).CodeSnippet !== 'undefined');
      expect(exists).toBe(true);
    });

    test('has expected API methods', async ({ page }) => {
      const methods = await page.evaluate(() => {
        const cs = (window as any).CodeSnippet;
        return {
          init: typeof cs.init,
          initSnippet: typeof cs.initSnippet,
          expand: typeof cs.expand,
          collapse: typeof cs.collapse,
          showLang: typeof cs.showLang,
          copyCode: typeof cs.copyCode,
          highlightHtml: typeof cs.highlightHtml,
          highlightCss: typeof cs.highlightCss,
          highlightJs: typeof cs.highlightJs
        };
      });

      expect(methods.init).toBe('function');
      expect(methods.initSnippet).toBe('function');
      expect(methods.expand).toBe('function');
      expect(methods.collapse).toBe('function');
      expect(methods.showLang).toBe('function');
      expect(methods.copyCode).toBe('function');
      expect(methods.highlightHtml).toBe('function');
      expect(methods.highlightCss).toBe('function');
      expect(methods.highlightJs).toBe('function');
    });

    test('expand method expands snippet', async ({ page }) => {
      await page.evaluate(() => {
        (window as any).CodeSnippet.expand('#collapsible-snippet');
      });

      const snippet = page.locator('#collapsible-snippet');
      await expect(snippet).toHaveAttribute('data-expanded', 'true');
    });

    test('collapse method collapses snippet', async ({ page }) => {
      await page.evaluate(() => {
        (window as any).CodeSnippet.collapse('#basic-snippet');
      });

      const snippet = page.locator('#basic-snippet');
      await expect(snippet).toHaveAttribute('data-expanded', 'false');
    });

    test('showLang switches to specified language tab', async ({ page }) => {
      await page.evaluate(() => {
        (window as any).CodeSnippet.showLang('#api-snippet', 'css');
      });

      const cssTab = page.locator('#api-snippet .vd-code-snippet-tab[data-lang="css"]');
      const cssPane = page.locator('#api-snippet .vd-code-snippet-pane[data-lang="css"]');

      await expect(cssTab).toHaveClass(/is-active/);
      await expect(cssPane).toHaveClass(/is-active/);
    });
  });

  test.describe('HTML Extraction', () => {
    test('extracts HTML from source element', async ({ page }) => {
      // The extraction should happen on init
      const pane = page.locator('#extract-snippet .vd-code-snippet-pane');
      const code = pane.locator('code');
      
      const content = await code.textContent();
      expect(content).toContain('Demo Button');
      expect(content).toContain('btn');
    });
  });
});