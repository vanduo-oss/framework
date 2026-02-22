/**
 * Unit Tests for Helpers
 * 
 * Tests for js/utils/helpers.js using Playwright's page.evaluate()
 * This approach tests code in real browser context without jsdom
 */

import { test, expect } from '@playwright/test';

test.describe('Helper Functions @unit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/fixtures/helpers.html');
    // Wait for helpers to be available
    await page.waitForFunction(() => typeof window.debounce === 'function');
  });

  test.describe('DOM Utilities', () => {
    test('ready() executes callback when DOM is ready', async ({ page }) => {
      const result = await page.evaluate(() => {
        return new Promise<boolean>((resolve) => {
          (window as any).ready(() => {
            resolve(document.readyState === 'complete' || document.readyState === 'interactive');
          });
        });
      });
      expect(result).toBe(true);
    });

    test('$() selects single element', async ({ page }) => {
      const result = await page.evaluate(() => {
        const el = (window as any).$('#test-element');
        return el?.dataset.test === 'value';
      });
      expect(result).toBe(true);
    });

    test('$$() selects multiple elements', async ({ page }) => {
      const result = await page.evaluate(() => {
        const elements = (window as any).$$('.test-class');
        return elements.length === 3;
      });
      expect(result).toBe(true);
    });

    test('hasClass() checks for class presence', async ({ page }) => {
      const result = await page.evaluate(() => {
        const el = document.getElementById('test-element');
        return (window as any).hasClass(el, 'test-class');
      });
      expect(result).toBe(true);
    });

    test('addClass() adds class to element', async ({ page }) => {
      await page.evaluate(() => {
        const el = document.getElementById('test-element');
        (window as any).addClass(el, 'new-class');
      });
      
      const hasClass = await page.evaluate(() => {
        const el = document.getElementById('test-element');
        return el?.classList.contains('new-class');
      });
      expect(hasClass).toBe(true);
    });

    test('removeClass() removes class from element', async ({ page }) => {
      await page.evaluate(() => {
        const el = document.getElementById('test-element');
        (window as any).removeClass(el, 'test-class');
      });
      
      const hasClass = await page.evaluate(() => {
        const el = document.getElementById('test-element');
        return el?.classList.contains('test-class');
      });
      expect(hasClass).toBe(false);
    });

    test('toggleClass() toggles class presence', async ({ page }) => {
      await page.evaluate(() => {
        const el = document.getElementById('test-element');
        (window as any).toggleClass(el, 'toggle-class');
      });
      
      const hasClass = await page.evaluate(() => {
        const el = document.getElementById('test-element');
        return el?.classList.contains('toggle-class');
      });
      expect(hasClass).toBe(true);

      // Toggle again - should remove
      await page.evaluate(() => {
        const el = document.getElementById('test-element');
        (window as any).toggleClass(el, 'toggle-class');
      });
      
      const hasClassAfter = await page.evaluate(() => {
        const el = document.getElementById('test-element');
        return el?.classList.contains('toggle-class');
      });
      expect(hasClassAfter).toBe(false);
    });
  });

  test.describe('Debounce & Throttle', () => {
    test('debounce delays function execution', async ({ page }) => {
      const result = await page.evaluate(() => {
        return new Promise<{ immediateCount: number; delayedCount: number }>((resolve) => {
          let callCount = 0;
          const debouncedFn = (window as any).debounce(() => {
            callCount++;
          }, 100);

          // Call multiple times rapidly
          debouncedFn();
          debouncedFn();
          debouncedFn();

          const immediateCount = callCount;

          // Wait for debounce to execute
          setTimeout(() => {
            resolve({ immediateCount, delayedCount: callCount });
          }, 200);
        });
      });

      expect(result.immediateCount).toBe(0); // Should not execute immediately
      expect(result.delayedCount).toBe(1); // Should execute once after delay
    });

    test('debounce executes only once after multiple rapid calls', async ({ page }) => {
      const result = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let callCount = 0;
          const debouncedFn = (window as any).debounce(() => {
            callCount++;
          }, 50);

          // Call multiple times rapidly
          debouncedFn();
          debouncedFn();
          debouncedFn();

          // Wait for debounce to complete
          setTimeout(() => {
            resolve(callCount);
          }, 100);
        });
      });

      expect(result).toBe(1); // Should execute once after delay
    });

    test('throttle limits execution rate', async ({ page }) => {
      const result = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let callCount = 0;
          const throttledFn = (window as any).throttle(() => {
            callCount++;
          }, 100);

          // Call multiple times rapidly
          throttledFn();
          throttledFn();
          throttledFn();
          throttledFn();
          throttledFn();

          // Should have executed only once (or twice depending on timing)
          resolve(callCount);
        });
      });

      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(2);
    });
  });

  test.describe('Attribute Utilities', () => {
    test('data() retrieves data attributes', async ({ page }) => {
      const result = await page.evaluate(() => {
        const el = document.getElementById('test-element');
        return (window as any).data(el, 'test');
      });
      expect(result).toBe('value');
    });

    test('data() sets data attributes', async ({ page }) => {
      await page.evaluate(() => {
        const el = document.getElementById('test-element');
        (window as any).data(el, 'new-attr', 'new-value');
      });
      
      const result = await page.evaluate(() => {
        const el = document.getElementById('test-element');
        return el?.dataset.newAttr;
      });
      expect(result).toBe('new-value');
    });
  });

  test.describe('Position Utilities', () => {
    test('getPosition() returns element position', async ({ page }) => {
      const result = await page.evaluate(() => {
        const el = document.getElementById('visible-element');
        return (window as any).getPosition(el);
      });
      expect(result).toHaveProperty('top');
      expect(result).toHaveProperty('left');
      expect(result).toHaveProperty('width');
      expect(result).toHaveProperty('height');
      expect(typeof result.width).toBe('number');
      expect(typeof result.height).toBe('number');
    });
  });

  test.describe('String Utilities', () => {
    test('escapeHtml() escapes HTML special characters', async ({ page }) => {
      const result = await page.evaluate(() => {
        return (window as any).escapeHtml('<script>alert("xss")</script>');
      });
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;');
    });

    test('sanitizeHtml() fails closed when DOMParser is unavailable', async ({ page }) => {
      const result = await page.evaluate(() => {
        const originalDOMParser = (window as any).DOMParser;
        (window as any).DOMParser = function () {
          throw new Error('DOMParser unavailable');
        } as any;

        try {
          return (window as any).sanitizeHtml('<b>safe</b><script>alert(1)</script>');
        } finally {
          (window as any).DOMParser = originalDOMParser;
        }
      });

      expect(result).toContain('&lt;b&gt;safe&lt;/b&gt;');
      expect(result).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(result).not.toContain('<script>');
    });
  });
});
