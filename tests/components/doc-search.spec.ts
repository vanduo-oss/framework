/**
 * Doc Search Component Tests
 *
 * Tests for js/components/doc-search.js
 * Covers: initialization, idempotent init, factory API, search, keyboard nav,
 *         icon extraction, destroy/re-init lifecycle
 */

import { test, expect } from '@playwright/test';

test.describe('Doc Search Component @component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/fixtures/doc-search.html');
    await page.waitForTimeout(100);
  });

  // ─── Initialization ───────────────────────────────────────────────

  test.describe('Initialization', () => {
    test('Search singleton is exposed globally', async ({ page }) => {
      const exists = await page.evaluate(() =>
        typeof (window as any).Search === 'object' &&
        typeof (window as any).Search.create === 'function'
      );
      expect(exists).toBe(true);
    });

    test('Search.create() returns an instance with the expected API', async ({ page }) => {
      const api = await page.evaluate(() => {
        const s = (window as any).Search.create({
          containerSelector: '#test-search',
        });
        return {
          hasInit: typeof s.init === 'function',
          hasDestroy: typeof s.destroy === 'function',
          hasSearch: typeof s.search === 'function',
          hasOpen: typeof s.open === 'function',
          hasClose: typeof s.close === 'function',
          hasRebuild: typeof s.rebuild === 'function',
          hasGetConfig: typeof s.getConfig === 'function',
          hasGetIndex: typeof s.getIndex === 'function',
        };
      });
      expect(api.hasInit).toBe(true);
      expect(api.hasDestroy).toBe(true);
      expect(api.hasSearch).toBe(true);
      expect(api.hasOpen).toBe(true);
      expect(api.hasClose).toBe(true);
      expect(api.hasRebuild).toBe(true);
      expect(api.hasGetConfig).toBe(true);
      expect(api.hasGetIndex).toBe(true);
    });

    test('sets correct ARIA attributes after init', async ({ page }) => {
      await page.evaluate(() => {
        (window as any).Search.create({ containerSelector: '#test-search' });
      });

      const input = page.locator('#test-search .vd-doc-search-input');
      const results = page.locator('#test-search .vd-doc-search-results');

      await expect(input).toHaveAttribute('role', 'combobox');
      await expect(input).toHaveAttribute('aria-autocomplete', 'list');
      await expect(input).toHaveAttribute('aria-expanded', 'false');
      await expect(results).toHaveAttribute('role', 'listbox');
    });

    test('builds search index from DOM sections', async ({ page }) => {
      const count = await page.evaluate(() => {
        const s = (window as any).Search.create({
          containerSelector: '#test-search',
        });
        return s.getIndex().length;
      });
      // 4 sections: intro, install, buttons, icons
      expect(count).toBe(4);
    });
  });

  // ─── Idempotent init (double-init guard) ──────────────────────────

  test.describe('Idempotent init', () => {
    test('calling init() twice does not duplicate event listeners', async ({ page }) => {
      const callbackCount = await page.evaluate(() => {
        let openCount = 0;
        const s = (window as any).Search.create({
          containerSelector: '#test-search',
          onOpen: () => { openCount++; },
          minQueryLength: 1,
        });
        // Call init() again (simulating legacy .create().init() pattern)
        s.init();
        // Trigger a search to fire the onOpen callback
        const input = document.querySelector('#test-search .vd-doc-search-input') as HTMLInputElement;
        input.value = 'button';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return new Promise<number>(resolve => setTimeout(() => resolve(openCount), 300));
      });
      // Should fire exactly once, not twice
      expect(callbackCount).toBe(1);
    });

    test('Search.create(...).init() pattern returns the instance (not null)', async ({ page }) => {
      const result = await page.evaluate(() => {
        const s = (window as any).Search.create({
          containerSelector: '#test-search',
        });
        const s2 = s.init(); // second init call
        return {
          instanceNotNull: s !== null,
          secondInitReturnsSame: s2 === s,
        };
      });
      expect(result.instanceNotNull).toBe(true);
      expect(result.secondInitReturnsSame).toBe(true);
    });
  });

  // ─── Factory returns instance even when DOM missing ───────────────

  test.describe('Factory resilience', () => {
    test('create() returns instance even if container does not exist', async ({ page }) => {
      const result = await page.evaluate(() => {
        const s = (window as any).Search.create({
          containerSelector: '#nonexistent-container',
        });
        return {
          isNotNull: s !== null,
          hasInit: typeof s.init === 'function',
          hasDestroy: typeof s.destroy === 'function',
        };
      });
      expect(result.isNotNull).toBe(true);
      expect(result.hasInit).toBe(true);
      expect(result.hasDestroy).toBe(true);
    });

    test('instance can be initialized later after DOM appears', async ({ page }) => {
      const count = await page.evaluate(() => {
        // Create with a container that doesn't exist yet
        const s = (window as any).Search.create({
          containerSelector: '#deferred-search',
        });
        // First init fails (no DOM) — getIndex returns empty
        const before = s.getIndex().length;

        // Inject DOM
        document.querySelector('main')!.insertAdjacentHTML('beforeend', `
          <div class="vd-doc-search" id="deferred-search">
            <input type="search" class="vd-doc-search-input">
            <div class="vd-doc-search-results"></div>
          </div>
        `);

        // Update config to point to new container and retry init
        s.setConfig({ containerSelector: '#deferred-search' });
        s.init();
        // Index won't have content sections since we didn't add any,
        // but init should succeed (not throw) and return the instance.
        return before;
      });
      expect(count).toBe(0);
    });
  });

  // ─── Search functionality ─────────────────────────────────────────

  test.describe('Search', () => {
    test('search() returns scored results matching query', async ({ page }) => {
      const results = await page.evaluate(() => {
        const s = (window as any).Search.create({
          containerSelector: '#test-search',
        });
        return s.search('button').map((r: any) => r.id);
      });
      expect(results).toContain('section-buttons');
    });

    test('search() returns empty array for non-matching query', async ({ page }) => {
      const results = await page.evaluate(() => {
        const s = (window as any).Search.create({
          containerSelector: '#test-search',
        });
        return s.search('xyznonexistent');
      });
      expect(results).toHaveLength(0);
    });

    test('title matches score higher than content matches', async ({ page }) => {
      const first = await page.evaluate(() => {
        const s = (window as any).Search.create({
          containerSelector: '#test-search',
        });
        const results = s.search('introduction');
        return results.length > 0 ? results[0].id : null;
      });
      expect(first).toBe('section-intro');
    });
  });

  // ─── Icon extraction ──────────────────────────────────────────────

  test.describe('Icon extraction', () => {
    test('extracts icon class from section titles', async ({ page }) => {
      const icons = await page.evaluate(() => {
        const s = (window as any).Search.create({
          containerSelector: '#test-search',
        });
        const idx = s.getIndex();
        return idx.reduce((map: any, entry: any) => {
          map[entry.id] = entry.icon;
          return map;
        }, {});
      });
      expect(icons['section-intro']).toBe('ph-rocket-launch');
      expect(icons['section-buttons']).toBe('ph-cursor-click');
      // section-install has no icon
      expect(icons['section-install']).toBe('');
    });

    test('extracts icon when element has multiple classes', async ({ page }) => {
      const icon = await page.evaluate(() => {
        const s = (window as any).Search.create({
          containerSelector: '#test-search',
        });
        const entry = s.getIndex().find((e: any) => e.id === 'section-icons');
        return entry ? entry.icon : null;
      });
      // <i class="ph ph-star extra-class"> — should find ph-star
      expect(icon).toBe('ph-star');
    });
  });

  // ─── Keyboard navigation ──────────────────────────────────────────

  test.describe('Keyboard navigation', () => {
    test('Cmd/Ctrl+K focuses the search input', async ({ page }) => {
      await page.evaluate(() => {
        (window as any).Search.create({ containerSelector: '#test-search' });
      });
      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
      await page.keyboard.press(`${modifier}+k`);
      const focused = await page.evaluate(() =>
        document.activeElement?.classList.contains('vd-doc-search-input')
      );
      expect(focused).toBe(true);
    });

    test('Escape closes the results dropdown', async ({ page }) => {
      await page.evaluate(() => {
        const s = (window as any).Search.create({
          containerSelector: '#test-search',
          minQueryLength: 1,
        });
        // Programmatically type and open
        const input = document.querySelector('#test-search .vd-doc-search-input') as HTMLInputElement;
        input.value = 'button';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await page.waitForTimeout(300);
      // Results should be open
      await expect(page.locator('#test-search .vd-doc-search-results')).toHaveClass(/is-open/);
      // Press Escape
      await page.locator('#test-search .vd-doc-search-input').focus();
      await page.keyboard.press('Escape');
      await expect(page.locator('#test-search .vd-doc-search-results')).not.toHaveClass(/is-open/);
    });
  });

  // ─── Destroy / re-init lifecycle ──────────────────────────────────

  test.describe('Lifecycle', () => {
    test('destroy() clears state and allows re-initialization', async ({ page }) => {
      const result = await page.evaluate(() => {
        const s = (window as any).Search.create({
          containerSelector: '#test-search',
        });
        const beforeDestroy = s.getIndex().length;
        s.destroy();
        const afterDestroy = s.getIndex().length;
        // Re-init
        s.init();
        const afterReinit = s.getIndex().length;
        return { beforeDestroy, afterDestroy, afterReinit };
      });
      expect(result.beforeDestroy).toBe(4);
      expect(result.afterDestroy).toBe(0);
      expect(result.afterReinit).toBe(4);
    });

    test('destroy() removes event listeners (no callbacks fire after)', async ({ page }) => {
      const fired = await page.evaluate(() => {
        let count = 0;
        const s = (window as any).Search.create({
          containerSelector: '#test-search',
          minQueryLength: 1,
          onSearch: () => { count++; },
        });
        s.destroy();
        // Try to trigger search — should not fire onSearch
        const input = document.querySelector('#test-search .vd-doc-search-input') as HTMLInputElement;
        if (input) {
          input.value = 'test';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        return new Promise<number>(resolve => setTimeout(() => resolve(count), 300));
      });
      expect(fired).toBe(0);
    });
  });

  // ─── Custom data source ───────────────────────────────────────────

  test.describe('Custom data', () => {
    test('indexes custom data array instead of DOM', async ({ page }) => {
      const result = await page.evaluate(() => {
        const s = (window as any).Search.create({
          containerSelector: '#test-search',
          data: [
            { id: 'a', title: 'Alpha', content: 'First item', category: 'Greek' },
            { id: 'b', title: 'Beta', content: 'Second item', category: 'Greek' },
          ],
        });
        return {
          count: s.getIndex().length,
          titles: s.getIndex().map((e: any) => e.title),
          searchResult: s.search('alpha').map((r: any) => r.id),
        };
      });
      expect(result.count).toBe(2);
      expect(result.titles).toEqual(['Alpha', 'Beta']);
      expect(result.searchResult).toContain('a');
    });
  });

  test.describe('Callback isolation', () => {
    test('contains thrown onSearch callback errors and still opens results', async ({ page }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (err) => pageErrors.push(err.message));

      await page.evaluate(() => {
        (window as any).Search.create({
          containerSelector: '#test-search',
          minQueryLength: 1,
          debounceMs: 10,
          onSearch: () => {
            throw new Error('onSearch callback boom');
          },
        });

        const input = document.querySelector('#test-search .vd-doc-search-input') as HTMLInputElement;
        input.value = 'button';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await page.waitForTimeout(80);
      await expect(page.locator('#test-search .vd-doc-search-results')).toHaveClass(/is-open/);
      expect(pageErrors).toEqual([]);
    });

    test('contains thrown onSelect callback errors and preserves control flow', async ({ page }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (err) => pageErrors.push(err.message));

      await page.evaluate(() => {
        (window as any).Search.create({
          containerSelector: '#test-search',
          minQueryLength: 1,
          debounceMs: 10,
          onSelect: () => {
            throw new Error('onSelect callback boom');
          },
        });

        const input = document.querySelector('#test-search .vd-doc-search-input') as HTMLInputElement;
        input.value = 'button';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });

      await page.waitForTimeout(100);
      await page.locator('#test-search .vd-doc-search-result').first().click();
      await expect(page.locator('#test-search .vd-doc-search-input')).toHaveValue('');
      await expect(page.locator('#test-search .vd-doc-search-results')).not.toHaveClass(/is-open/);
      expect(pageErrors).toEqual([]);
    });
  });
});
