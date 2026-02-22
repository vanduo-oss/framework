/**
 * Vanduo Framework - Code Snippet Component
 * Copyable code blocks with tabs, syntax highlighting, and HTML extraction
 */

(function () {
  'use strict';

  /**
   * Code Snippet Component
   */
  const CodeSnippet = {
    _snippetIdCounter: 0,

    getSnippetInstanceId: function (snippet) {
      if (snippet.dataset.codeSnippetId) {
        return snippet.dataset.codeSnippetId;
      }

      const baseId = (snippet.id || '').trim();
      if (baseId) {
        snippet.dataset.codeSnippetId = `snippet-${baseId}`;
        return snippet.dataset.codeSnippetId;
      }

      this._snippetIdCounter += 1;
      snippet.dataset.codeSnippetId = `snippet-auto-${this._snippetIdCounter}`;
      return snippet.dataset.codeSnippetId;
    },

    addListener: function (snippet, target, event, handler) {
      if (!target) return;
      target.addEventListener(event, handler);
      if (!snippet._codeSnippetCleanup) {
        snippet._codeSnippetCleanup = [];
      }
      snippet._codeSnippetCleanup.push(() => target.removeEventListener(event, handler));
    },

    /**
     * Initialize all code snippet components
     */
    init: function () {
      const snippets = document.querySelectorAll('.vd-code-snippet');

      snippets.forEach(snippet => {
        if (!snippet.dataset.initialized) {
          this.initSnippet(snippet);
        }
      });
    },

    /**
     * Initialize a single code snippet
     * @param {HTMLElement} snippet - Code snippet container element
     */
    initSnippet: function (snippet) {
      snippet.dataset.initialized = 'true';
      snippet._codeSnippetCleanup = [];

      // Handle collapsible toggle
      const toggle = snippet.querySelector('.vd-code-snippet-toggle');
      const content = snippet.querySelector('.vd-code-snippet-content');

      if (toggle && content) {
        this.initCollapsible(snippet, toggle, content);
      }

      // Handle tabs
      const tabs = snippet.querySelectorAll('.vd-code-snippet-tab');
      const panes = snippet.querySelectorAll('.vd-code-snippet-pane');

      if (tabs.length > 0) {
        this.initTabs(snippet, tabs, panes);
      }

      // Handle copy button
      const copyBtn = snippet.querySelector('.vd-code-snippet-copy');
      if (copyBtn) {
        this.initCopyButton(snippet, copyBtn);
      }

      // Handle HTML extraction
      const extractPanes = snippet.querySelectorAll('[data-extract]');
      extractPanes.forEach(pane => {
        this.extractHtml(pane);
      });

      // Handle line numbers
      const lineNumberPanes = snippet.querySelectorAll('.has-line-numbers');
      lineNumberPanes.forEach(pane => {
        this.addLineNumbers(pane);
      });
    },

    /**
     * Initialize collapsible functionality
     * @param {HTMLElement} snippet - Code snippet container
     * @param {HTMLElement} toggle - Toggle button
     * @param {HTMLElement} content - Collapsible content
     */
    initCollapsible: function (snippet, toggle, content) {
      // Set initial state
      const isExpanded = snippet.dataset.expanded === 'true';
      toggle.setAttribute('aria-expanded', isExpanded);
      content.dataset.visible = isExpanded;

      this.addListener(snippet, toggle, 'click', () => {
        const expanded = snippet.dataset.expanded === 'true';
        snippet.dataset.expanded = !expanded;
        toggle.setAttribute('aria-expanded', !expanded);
        content.dataset.visible = !expanded;

        // Extract HTML on first expand if needed
        if (!expanded) {
          const extractPanes = content.querySelectorAll('[data-extract]:not([data-extracted])');
          extractPanes.forEach(pane => {
            this.extractHtml(pane);
          });
        }

        // Dispatch event
        const event = new CustomEvent('codesnippet:toggle', {
          bubbles: true,
          detail: { snippet, expanded: !expanded }
        });
        snippet.dispatchEvent(event);
      });
    },

    /**
     * Initialize tab functionality
     * @param {HTMLElement} snippet - Code snippet container
     * @param {NodeList} tabs - Tab buttons
     * @param {NodeList} panes - Code panes
     */
    initTabs: function (snippet, tabs, panes) {
      const snippetId = this.getSnippetInstanceId(snippet);

      // Set up ARIA attributes
      const tabList = snippet.querySelector('.vd-code-snippet-tabs');
      if (tabList) {
        tabList.setAttribute('role', 'tablist');
      }

      tabs.forEach((tab, index) => {
        const lang = tab.dataset.lang;
        const isActive = tab.classList.contains('is-active');

        // Set ARIA attributes
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', isActive);
        tab.setAttribute('tabindex', isActive ? '0' : '-1');
        tab.id = tab.id || `code-tab-${snippetId}-${lang || 'tab'}-${index}`;

        // Find corresponding pane
        const pane = snippet.querySelector(`.vd-code-snippet-pane[data-lang="${lang}"]`);
        if (pane) {
          pane.id = pane.id || `code-pane-${snippetId}-${lang || 'pane'}-${index}`;
          pane.setAttribute('role', 'tabpanel');
          tab.setAttribute('aria-controls', pane.id);
          pane.setAttribute('aria-labelledby', tab.id);
        }

        // Click handler
        this.addListener(snippet, tab, 'click', () => {
          this.switchTab(snippet, tab, tabs, panes);
        });

        // Keyboard navigation
        this.addListener(snippet, tab, 'keydown', (e) => {
          this.handleTabKeydown(e, snippet, tabs, panes);
        });
      });
    },

    /**
     * Switch to a specific tab
     * @param {HTMLElement} snippet - Code snippet container
     * @param {HTMLElement} activeTab - Tab to activate
     * @param {NodeList} tabs - All tab buttons
     * @param {NodeList} panes - All code panes
     */
    switchTab: function (snippet, activeTab, tabs, panes) {
      const lang = activeTab.dataset.lang;

      // Deactivate all tabs
      tabs.forEach(tab => {
        tab.classList.remove('is-active');
        tab.setAttribute('aria-selected', 'false');
        tab.setAttribute('tabindex', '-1');
      });

      // Hide all panes
      panes.forEach(pane => {
        pane.classList.remove('is-active');
      });

      // Activate selected tab
      activeTab.classList.add('is-active');
      activeTab.setAttribute('aria-selected', 'true');
      activeTab.setAttribute('tabindex', '0');

      // Show corresponding pane
      const activePane = snippet.querySelector(`.vd-code-snippet-pane[data-lang="${lang}"]`);
      if (activePane) {
        activePane.classList.add('is-active');
      }

      // Dispatch event
      const event = new CustomEvent('codesnippet:tabchange', {
        bubbles: true,
        detail: { snippet, tab: activeTab, lang }
      });
      snippet.dispatchEvent(event);
    },

    /**
     * Handle keyboard navigation for tabs
     * @param {KeyboardEvent} e - Keyboard event
     * @param {HTMLElement} snippet - Code snippet container
     * @param {NodeList} tabs - All tab buttons
     * @param {NodeList} panes - All code panes
     */
    handleTabKeydown: function (e, snippet, tabs, panes) {
      const tabArray = Array.from(tabs);
      const currentIndex = tabArray.indexOf(e.target);
      let newIndex;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          newIndex = currentIndex > 0 ? currentIndex - 1 : tabArray.length - 1;
          break;
        case 'ArrowRight':
          e.preventDefault();
          newIndex = currentIndex < tabArray.length - 1 ? currentIndex + 1 : 0;
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = tabArray.length - 1;
          break;
        default:
          return;
      }

      if (newIndex !== currentIndex) {
        tabArray[newIndex].focus();
        this.switchTab(snippet, tabArray[newIndex], tabs, panes);
      }
    },

    /**
     * Initialize copy button
     * @param {HTMLElement} snippet - Code snippet container
     * @param {HTMLElement} copyBtn - Copy button element
     */
    initCopyButton: function (snippet, copyBtn) {
      this.addListener(snippet, copyBtn, 'click', async () => {
        await this.copyCode(snippet, copyBtn);
      });
    },

    /**
     * Copy code to clipboard
     * @param {HTMLElement} snippet - Code snippet container
     * @param {HTMLElement} copyBtn - Copy button element
     */
    copyCode: async function (snippet, copyBtn) {
      const activePane = snippet.querySelector('.vd-code-snippet-pane.is-active') ||
        snippet.querySelector('.vd-code-snippet-pane');

      if (!activePane) {
        console.warn('CodeSnippet: No code pane found');
        return;
      }

      const codeElement = activePane.querySelector('code') || activePane;
      const code = codeElement.textContent;

      try {
        await navigator.clipboard.writeText(code);
        this.showCopyFeedback(copyBtn, true);
      } catch (_err) {
        // Fallback for older browsers
        const success = this.fallbackCopy(code);
        this.showCopyFeedback(copyBtn, success);
      }

      // Dispatch event
      const event = new CustomEvent('codesnippet:copy', {
        bubbles: true,
        detail: { snippet, code, success: true }
      });
      snippet.dispatchEvent(event);
    },

    /**
     * Fallback copy method for older browsers
     * @param {string} text - Text to copy
     * @returns {boolean} Success status
     */
    fallbackCopy: function (text) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      let success = false;
      try {
        success = document.execCommand('copy');
      } catch (err) {
        console.warn('CodeSnippet: Fallback copy failed', err);
      }

      document.body.removeChild(textarea);
      return success;
    },

    /**
     * Show copy feedback
     * @param {HTMLElement} copyBtn - Copy button element
     * @param {boolean} success - Whether copy was successful
     */
    showCopyFeedback: function (copyBtn, success) {
      if (success) {
        copyBtn.classList.add('is-copied');

        // Announce to screen readers
        const announcement = document.createElement('span');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        announcement.textContent = 'Code copied to clipboard';
        copyBtn.appendChild(announcement);

        setTimeout(() => {
          copyBtn.classList.remove('is-copied');
          if (announcement.parentNode) {
            announcement.parentNode.removeChild(announcement);
          }
        }, 2000);
      }
    },

    /**
     * Extract HTML from a demo element
     * @param {HTMLElement} pane - Code pane with data-extract attribute
     */
    extractHtml: function (pane) {
      const selector = pane.dataset.extract;
      if (!selector) return;

      const source = document.querySelector(selector);
      if (!source) {
        console.warn(`CodeSnippet: Source element not found: ${selector}`);
        return;
      }

      // Get inner HTML
      let html = source.innerHTML;

      // Format the HTML
      html = this.formatHtml(html);

      // Escape for display
      html = this.escapeHtml(html);

      // Apply syntax highlighting
      html = this.highlightHtml(html);

      // Set content via DOM API to avoid string-based HTML insertion
      const codeEl = document.createElement('code');
      codeEl.innerHTML = html;
      pane.replaceChildren(codeEl);
      pane.dataset.extracted = 'true';
    },

    /**
     * Format HTML with proper indentation
     * @param {string} html - Raw HTML string
     * @returns {string} Formatted HTML
     */
    formatHtml: function (html) {
      // Remove leading/trailing whitespace
      html = html.trim();

      // Simple formatting: normalize whitespace
      // Split by tags, then rejoin with proper indentation
      const lines = html.split('\n');
      let indent = 0;
      const indentSize = 2;
      const formattedLines = [];

      lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        // Check for closing tags at start
        if (line.match(/^<\/\w/)) {
          indent = Math.max(0, indent - indentSize);
        }

        formattedLines.push(' '.repeat(indent) + line);

        // Check for opening tags (not self-closing)
        // Use short fixed-length regex + indexOf to prevent ReDoS
        const hasOpenTag = /<[a-zA-Z]/.test(line);
        const isSelfClosing = line.includes('/>');
        if (hasOpenTag && !isSelfClosing) {
          // Don't indent for void elements
          if (!line.match(/<(br|hr|img|input|meta|link|area|base|col|embed|param|source|track|wbr)/i)) {
            // Only indent if not also closing on same line
            if (!line.match(/<\/\w+>$/)) {
              indent += indentSize;
            }
          }
        }
      });

      return formattedLines.join('\n');
    },

    /**
     * Escape HTML entities for display
     * @param {string} html - HTML string
     * @returns {string} Escaped HTML
     */
    escapeHtml: function (html) {
      const div = document.createElement('div');
      div.textContent = html;
      return div.innerHTML;
    },

    /**
     * Apply syntax highlighting to HTML
     * @param {string} html - Escaped HTML string
     * @returns {string} HTML with syntax highlighting spans
     */
    highlightHtml: function (html) {
      // Highlight HTML tags
      html = html.replace(/(&lt;\/?)([\w-]+)/g, '$1<span class="code-tag">$2</span>');

      // Highlight attributes
      html = html.replace(/([\w-]+)(=)(&quot;|&#39;)/g, '<span class="code-attr">$1</span>$2$3');

      // Highlight attribute values (strings)
      html = html.replace(/(&quot;|&#39;)([^&]*)(&quot;|&#39;)/g, '$1<span class="code-string">$2</span>$3');

      // Highlight comments
      html = html.replace(/(&lt;!--)(.*?)(--&gt;)/g, '<span class="code-comment">$1$2$3</span>');

      return html;
    },

    /**
     * Apply syntax highlighting to CSS
     * @param {string} css - CSS string
     * @returns {string} CSS with syntax highlighting spans
     */
    highlightCss: function (css) {
      // Highlight selectors — use non-backtracking bounded pattern
      css = css.replace(/([.#]?[a-zA-Z][a-zA-Z0-9_-]{0,200})(\s*\{)/g, '<span class="code-selector">$1</span>$2');

      // Highlight properties — use non-backtracking bounded pattern
      css = css.replace(/([a-zA-Z][a-zA-Z0-9_-]{0,200})(\s*:)/g, '<span class="code-property">$1</span>$2');

      // Highlight values
      css = css.replace(/:\s*([^;{}]+)(;)/g, ': <span class="code-value">$1</span>$2');

      // Highlight units
      css = css.replace(/(\d+)(px|rem|em|%|vh|vw|deg|s|ms)/g, '<span class="code-number">$1</span><span class="code-unit">$2</span>');

      // Highlight comments
      css = css.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="code-comment">$1</span>');

      return css;
    },

    /**
     * Apply syntax highlighting to JavaScript
     * @param {string} js - JavaScript string
     * @returns {string} JS with syntax highlighting spans
     */
    highlightJs: function (js) {
      // Highlight keywords
      const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'new', 'this', 'class', 'extends', 'import', 'export', 'default', 'async', 'await', 'try', 'catch', 'throw', 'typeof', 'instanceof'];
      keywords.forEach(kw => {
        const regex = new RegExp(`\\b(${kw})\\b`, 'g');
        js = js.replace(regex, '<span class="code-keyword">$1</span>');
      });

      // Highlight strings (limit to 10 000 chars to prevent polynomial backtracking)
      js = js.replace(/('(?:[^'\\]|\\.){0,10000}'|"(?:[^"\\]|\\.){0,10000}"|`(?:[^`\\]|\\.){0,10000}`)/g, '<span class="code-string">$1</span>');

      // Highlight numbers
      js = js.replace(/\b(\d+\.?\d*)\b/g, '<span class="code-number">$1</span>');

      // Highlight function calls
      js = js.replace(/\b([\w]+)(\s*\()/g, '<span class="code-function">$1</span>$2');

      // Highlight comments
      js = js.replace(/(\/\/.*$)/gm, '<span class="code-comment">$1</span>');
      js = js.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="code-comment">$1</span>');

      return js;
    },

    /**
     * Add line numbers to a code pane
     * @param {HTMLElement} pane - Code pane element
     */
    addLineNumbers: function (pane) {
      const code = pane.querySelector('code');
      if (!code) return;

      const lines = code.innerHTML.split('\n');
      const lineCount = lines.length;

      // Create line numbers container
      const lineNumbers = document.createElement('div');
      lineNumbers.className = 'vd-code-snippet-line-numbers';
      lineNumbers.setAttribute('aria-hidden', 'true');

      for (let i = 1; i <= lineCount; i++) {
        const lineNum = document.createElement('span');
        lineNum.textContent = i;
        lineNumbers.appendChild(lineNum);
      }

      // Wrap code content
      const codeWrapper = document.createElement('div');
      codeWrapper.className = 'vd-code-snippet-code';
      codeWrapper.appendChild(code.cloneNode(true));

      // Replace code with new structure
      code.parentNode.removeChild(code);
      pane.appendChild(lineNumbers);
      pane.appendChild(codeWrapper);
    },

    /**
     * Programmatically expand a code snippet
     * @param {string|HTMLElement} snippet - Snippet selector or element
     */
    expand: function (snippet) {
      if (typeof snippet === 'string') {
        snippet = document.querySelector(snippet);
      }
      if (!snippet) return;

      snippet.dataset.expanded = 'true';
      const toggle = snippet.querySelector('.vd-code-snippet-toggle');
      const content = snippet.querySelector('.vd-code-snippet-content');

      if (toggle) toggle.setAttribute('aria-expanded', 'true');
      if (content) content.dataset.visible = 'true';
    },

    /**
     * Programmatically collapse a code snippet
     * @param {string|HTMLElement} snippet - Snippet selector or element
     */
    collapse: function (snippet) {
      if (typeof snippet === 'string') {
        snippet = document.querySelector(snippet);
      }
      if (!snippet) return;

      snippet.dataset.expanded = 'false';
      const toggle = snippet.querySelector('.vd-code-snippet-toggle');
      const content = snippet.querySelector('.vd-code-snippet-content');

      if (toggle) toggle.setAttribute('aria-expanded', 'false');
      if (content) content.dataset.visible = 'false';
    },

    /**
     * Programmatically switch to a specific language tab
     * @param {string|HTMLElement} snippet - Snippet selector or element
     * @param {string} lang - Language to switch to (html, css, js)
     */
    showLang: function (snippet, lang) {
      if (typeof snippet === 'string') {
        snippet = document.querySelector(snippet);
      }
      if (!snippet) return;

      const tab = snippet.querySelector(`.vd-code-snippet-tab[data-lang="${lang}"]`);
      const tabs = snippet.querySelectorAll('.vd-code-snippet-tab');
      const panes = snippet.querySelectorAll('.vd-code-snippet-pane');

      if (tab) {
        this.switchTab(snippet, tab, tabs, panes);
      }
    },

    /**
     * Destroy a code snippet instance and clean up listeners
     * @param {string|HTMLElement} snippet - Snippet selector or element
     */
    destroy: function (snippet) {
      if (typeof snippet === 'string') {
        snippet = document.querySelector(snippet);
      }
      if (!snippet) return;

      if (snippet._codeSnippetCleanup) {
        snippet._codeSnippetCleanup.forEach(fn => fn());
        delete snippet._codeSnippetCleanup;
      }

      delete snippet.dataset.initialized;
    },

    /**
     * Destroy all code snippet instances
     */
    destroyAll: function () {
      const snippets = document.querySelectorAll('.vd-code-snippet[data-initialized="true"]');
      snippets.forEach(snippet => this.destroy(snippet));
    }
  };

  // Register with Vanduo framework if available
  if (typeof window.Vanduo !== 'undefined') {
    window.Vanduo.register('codeSnippet', CodeSnippet);
  }

  // Also expose globally for convenience
  window.CodeSnippet = CodeSnippet;

})();
