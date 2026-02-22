/*! Vanduo v1.2.0 | Built: 2026-02-22T21:30:31.940Z | git:64c88fd | development */

// js/utils/lifecycle.js
(function() {
  "use strict";
  const Lifecycle = {
    // Map of element -> { componentName, cleanupFunctions }
    instances: /* @__PURE__ */ new Map(),
    /**
     * Register a component instance
     * @param {HTMLElement} element - The DOM element
     * @param {string} componentName - Name of the component
     * @param {Array<Function>} cleanupFns - Functions to call on destroy
     */
    register: function(element, componentName, cleanupFns = []) {
      if (this.instances.has(element)) {
        const existing = this.instances.get(element);
        existing.cleanup = existing.cleanup.concat(cleanupFns);
        return;
      }
      this.instances.set(element, {
        component: componentName,
        cleanup: cleanupFns,
        registeredAt: Date.now()
      });
    },
    /**
     * Unregister a single element and run its cleanup
     * @param {HTMLElement} element - The element to unregister
     */
    unregister: function(element) {
      const instance = this.instances.get(element);
      if (!instance) return;
      instance.cleanup.forEach(function(fn) {
        try {
          fn();
        } catch (e) {
          console.warn("[Vanduo Lifecycle] Cleanup error:", e);
        }
      });
      this.instances.delete(element);
    },
    /**
     * Destroy all instances of a specific component
     * @param {string} componentName - Optional component name filter
     */
    destroyAll: function(componentName) {
      const toRemove = [];
      this.instances.forEach(function(instance, element) {
        if (!componentName || instance.component === componentName) {
          toRemove.push(element);
        }
      });
      toRemove.forEach(function(element) {
        Lifecycle.unregister(element);
      });
    },
    /**
     * Destroy all instances within a specific container
     * Useful for SPAs when navigating between pages
     * @param {HTMLElement} container - Container element
     */
    destroyAllInContainer: function(container) {
      const toRemove = [];
      this.instances.forEach(function(instance, element) {
        if (container.contains(element)) {
          toRemove.push(element);
        }
      });
      toRemove.forEach(function(element) {
        Lifecycle.unregister(element);
      });
    },
    /**
     * Get all registered instances (for debugging)
     * @returns {Array} Array of instance info objects
     */
    getAll: function() {
      const result = [];
      this.instances.forEach(function(instance, element) {
        result.push({
          element,
          component: instance.component,
          registeredAt: instance.registeredAt
        });
      });
      return result;
    },
    /**
     * Check if an element is registered
     * @param {HTMLElement} element - The element to check
     * @returns {boolean}
     */
    has: function(element) {
      return this.instances.has(element);
    }
  };
  window.addEventListener("beforeunload", function() {
    Lifecycle.destroyAll();
  });
  window.VanduoLifecycle = Lifecycle;
  if (typeof window.Vanduo !== "undefined") {
    window.Vanduo.register("lifecycle", Lifecycle);
  }
})();

// js/vanduo.js
(function() {
  "use strict";
  const Vanduo2 = {
    version: "1.2.0",
    components: {},
    /**
     * Initialize framework
     * Call this after DOM is ready and all components are loaded
     */
    init: function() {
      if (typeof ready !== "undefined") {
        ready(() => {
          this.initComponents();
        });
      } else {
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", () => {
            this.initComponents();
          });
        } else {
          this.initComponents();
        }
      }
    },
    /**
     * Initialize all components
     */
    initComponents: function() {
      Object.keys(this.components).forEach((name) => {
        const component = this.components[name];
        if (component.init && typeof component.init === "function") {
          try {
            component.init();
          } catch (e) {
            console.warn('[Vanduo] Failed to initialize component "' + name + '":', e);
          }
        }
      });
      console.log("Vanduo Framework v1.2.0 initialized");
    },
    /**
     * Register a component
     * @param {string} name - Component name
     * @param {Object} component - Component object with init method
     */
    register: function(name, component) {
      this.components[name] = component;
    },
    /**
     * Re-initialize a component (useful after dynamic DOM changes)
     * @param {string} name - Component name
     */
    reinit: function(name) {
      const component = this.components[name];
      if (component && component.init && typeof component.init === "function") {
        try {
          component.init();
        } catch (e) {
          console.warn('[Vanduo] Failed to reinitialize component "' + name + '":', e);
        }
      }
    },
    /**
     * Destroy all component instances and clean up event listeners
     * Uses lifecycle manager for memory leak prevention
     */
    destroyAll: function() {
      const names = Object.keys(this.components);
      for (let i = 0; i < names.length; i++) {
        const component = this.components[names[i]];
        if (component && component.destroyAll && typeof component.destroyAll === "function") {
          try {
            component.destroyAll();
          } catch (e) {
            console.warn('[Vanduo] Failed to destroy component "' + names[i] + '":', e);
          }
        }
      }
      if (typeof window.VanduoLifecycle !== "undefined") {
        window.VanduoLifecycle.destroyAll();
      }
    },
    /**
     * Get component instance
     * @param {string} name - Component name
     * @returns {Object|null}
     */
    getComponent: function(name) {
      return this.components[name] || null;
    }
  };
  window.Vanduo = Vanduo2;
})();

// js/components/code-snippet.js
(function() {
  "use strict";
  const CodeSnippet = {
    _snippetIdCounter: 0,
    getSnippetInstanceId: function(snippet) {
      if (snippet.dataset.codeSnippetId) {
        return snippet.dataset.codeSnippetId;
      }
      const baseId = (snippet.id || "").trim();
      if (baseId) {
        snippet.dataset.codeSnippetId = `snippet-${baseId}`;
        return snippet.dataset.codeSnippetId;
      }
      this._snippetIdCounter += 1;
      snippet.dataset.codeSnippetId = `snippet-auto-${this._snippetIdCounter}`;
      return snippet.dataset.codeSnippetId;
    },
    addListener: function(snippet, target, event, handler) {
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
    init: function() {
      const snippets = document.querySelectorAll(".vd-code-snippet");
      snippets.forEach((snippet) => {
        if (!snippet.dataset.initialized) {
          this.initSnippet(snippet);
        }
      });
    },
    /**
     * Initialize a single code snippet
     * @param {HTMLElement} snippet - Code snippet container element
     */
    initSnippet: function(snippet) {
      snippet.dataset.initialized = "true";
      snippet._codeSnippetCleanup = [];
      const toggle = snippet.querySelector(".vd-code-snippet-toggle");
      const content = snippet.querySelector(".vd-code-snippet-content");
      if (toggle && content) {
        this.initCollapsible(snippet, toggle, content);
      }
      const tabs = snippet.querySelectorAll(".vd-code-snippet-tab");
      const panes = snippet.querySelectorAll(".vd-code-snippet-pane");
      if (tabs.length > 0) {
        this.initTabs(snippet, tabs, panes);
      }
      const copyBtn = snippet.querySelector(".vd-code-snippet-copy");
      if (copyBtn) {
        this.initCopyButton(snippet, copyBtn);
      }
      const extractPanes = snippet.querySelectorAll("[data-extract]");
      extractPanes.forEach((pane) => {
        this.extractHtml(pane);
      });
      const lineNumberPanes = snippet.querySelectorAll(".has-line-numbers");
      lineNumberPanes.forEach((pane) => {
        this.addLineNumbers(pane);
      });
    },
    /**
     * Initialize collapsible functionality
     * @param {HTMLElement} snippet - Code snippet container
     * @param {HTMLElement} toggle - Toggle button
     * @param {HTMLElement} content - Collapsible content
     */
    initCollapsible: function(snippet, toggle, content) {
      const isExpanded = snippet.dataset.expanded === "true";
      toggle.setAttribute("aria-expanded", isExpanded);
      content.dataset.visible = isExpanded;
      this.addListener(snippet, toggle, "click", () => {
        const expanded = snippet.dataset.expanded === "true";
        snippet.dataset.expanded = !expanded;
        toggle.setAttribute("aria-expanded", !expanded);
        content.dataset.visible = !expanded;
        if (!expanded) {
          const extractPanes = content.querySelectorAll("[data-extract]:not([data-extracted])");
          extractPanes.forEach((pane) => {
            this.extractHtml(pane);
          });
        }
        const event = new CustomEvent("codesnippet:toggle", {
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
    initTabs: function(snippet, tabs, panes) {
      const snippetId = this.getSnippetInstanceId(snippet);
      const tabList = snippet.querySelector(".vd-code-snippet-tabs");
      if (tabList) {
        tabList.setAttribute("role", "tablist");
      }
      tabs.forEach((tab, index) => {
        const lang = tab.dataset.lang;
        const isActive = tab.classList.contains("is-active");
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-selected", isActive);
        tab.setAttribute("tabindex", isActive ? "0" : "-1");
        tab.id = tab.id || `code-tab-${snippetId}-${lang || "tab"}-${index}`;
        const pane = snippet.querySelector(`.vd-code-snippet-pane[data-lang="${lang}"]`);
        if (pane) {
          pane.id = pane.id || `code-pane-${snippetId}-${lang || "pane"}-${index}`;
          pane.setAttribute("role", "tabpanel");
          tab.setAttribute("aria-controls", pane.id);
          pane.setAttribute("aria-labelledby", tab.id);
        }
        this.addListener(snippet, tab, "click", () => {
          this.switchTab(snippet, tab, tabs, panes);
        });
        this.addListener(snippet, tab, "keydown", (e) => {
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
    switchTab: function(snippet, activeTab, tabs, panes) {
      const lang = activeTab.dataset.lang;
      tabs.forEach((tab) => {
        tab.classList.remove("is-active");
        tab.setAttribute("aria-selected", "false");
        tab.setAttribute("tabindex", "-1");
      });
      panes.forEach((pane) => {
        pane.classList.remove("is-active");
      });
      activeTab.classList.add("is-active");
      activeTab.setAttribute("aria-selected", "true");
      activeTab.setAttribute("tabindex", "0");
      const activePane = snippet.querySelector(`.vd-code-snippet-pane[data-lang="${lang}"]`);
      if (activePane) {
        activePane.classList.add("is-active");
      }
      const event = new CustomEvent("codesnippet:tabchange", {
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
    handleTabKeydown: function(e, snippet, tabs, panes) {
      const tabArray = Array.from(tabs);
      const currentIndex = tabArray.indexOf(e.target);
      let newIndex;
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          newIndex = currentIndex > 0 ? currentIndex - 1 : tabArray.length - 1;
          break;
        case "ArrowRight":
          e.preventDefault();
          newIndex = currentIndex < tabArray.length - 1 ? currentIndex + 1 : 0;
          break;
        case "Home":
          e.preventDefault();
          newIndex = 0;
          break;
        case "End":
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
    initCopyButton: function(snippet, copyBtn) {
      this.addListener(snippet, copyBtn, "click", async () => {
        await this.copyCode(snippet, copyBtn);
      });
    },
    /**
     * Copy code to clipboard
     * @param {HTMLElement} snippet - Code snippet container
     * @param {HTMLElement} copyBtn - Copy button element
     */
    copyCode: async function(snippet, copyBtn) {
      const activePane = snippet.querySelector(".vd-code-snippet-pane.is-active") || snippet.querySelector(".vd-code-snippet-pane");
      if (!activePane) {
        console.warn("CodeSnippet: No code pane found");
        return;
      }
      const codeElement = activePane.querySelector("code") || activePane;
      const code = codeElement.textContent;
      try {
        await navigator.clipboard.writeText(code);
        this.showCopyFeedback(copyBtn, true);
      } catch (_err) {
        const success = this.fallbackCopy(code);
        this.showCopyFeedback(copyBtn, success);
      }
      const event = new CustomEvent("codesnippet:copy", {
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
    fallbackCopy: function(text) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      let success = false;
      try {
        success = document.execCommand("copy");
      } catch (err) {
        console.warn("CodeSnippet: Fallback copy failed", err);
      }
      document.body.removeChild(textarea);
      return success;
    },
    /**
     * Show copy feedback
     * @param {HTMLElement} copyBtn - Copy button element
     * @param {boolean} success - Whether copy was successful
     */
    showCopyFeedback: function(copyBtn, success) {
      if (success) {
        copyBtn.classList.add("is-copied");
        const announcement = document.createElement("span");
        announcement.setAttribute("role", "status");
        announcement.setAttribute("aria-live", "polite");
        announcement.className = "sr-only";
        announcement.textContent = "Code copied to clipboard";
        copyBtn.appendChild(announcement);
        setTimeout(() => {
          copyBtn.classList.remove("is-copied");
          if (announcement.parentNode) {
            announcement.parentNode.removeChild(announcement);
          }
        }, 2e3);
      }
    },
    /**
     * Extract HTML from a demo element
     * @param {HTMLElement} pane - Code pane with data-extract attribute
     */
    extractHtml: function(pane) {
      const selector = pane.dataset.extract;
      if (!selector) return;
      const source = document.querySelector(selector);
      if (!source) {
        console.warn(`CodeSnippet: Source element not found: ${selector}`);
        return;
      }
      let html = source.innerHTML;
      html = this.formatHtml(html);
      html = this.escapeHtml(html);
      html = this.highlightHtml(html);
      const codeEl = document.createElement("code");
      codeEl.innerHTML = html;
      pane.replaceChildren(codeEl);
      pane.dataset.extracted = "true";
    },
    /**
     * Format HTML with proper indentation
     * @param {string} html - Raw HTML string
     * @returns {string} Formatted HTML
     */
    formatHtml: function(html) {
      html = html.trim();
      const lines = html.split("\n");
      let indent = 0;
      const indentSize = 2;
      const formattedLines = [];
      lines.forEach((line) => {
        line = line.trim();
        if (!line) return;
        if (line.match(/^<\/\w/)) {
          indent = Math.max(0, indent - indentSize);
        }
        formattedLines.push(" ".repeat(indent) + line);
        const hasOpenTag = /<[a-zA-Z]/.test(line);
        const isSelfClosing = line.includes("/>");
        if (hasOpenTag && !isSelfClosing) {
          if (!line.match(/<(br|hr|img|input|meta|link|area|base|col|embed|param|source|track|wbr)/i)) {
            if (!line.match(/<\/\w+>$/)) {
              indent += indentSize;
            }
          }
        }
      });
      return formattedLines.join("\n");
    },
    /**
     * Escape HTML entities for display
     * @param {string} html - HTML string
     * @returns {string} Escaped HTML
     */
    escapeHtml: function(html) {
      const div = document.createElement("div");
      div.textContent = html;
      return div.innerHTML;
    },
    /**
     * Apply syntax highlighting to HTML
     * @param {string} html - Escaped HTML string
     * @returns {string} HTML with syntax highlighting spans
     */
    highlightHtml: function(html) {
      html = html.replace(/(&lt;\/?)([\w-]+)/g, '$1<span class="code-tag">$2</span>');
      html = html.replace(/([\w-]+)(=)(&quot;|&#39;)/g, '<span class="code-attr">$1</span>$2$3');
      html = html.replace(/(&quot;|&#39;)([^&]*)(&quot;|&#39;)/g, '$1<span class="code-string">$2</span>$3');
      html = html.replace(/(&lt;!--)(.*?)(--&gt;)/g, '<span class="code-comment">$1$2$3</span>');
      return html;
    },
    /**
     * Apply syntax highlighting to CSS
     * @param {string} css - CSS string
     * @returns {string} CSS with syntax highlighting spans
     */
    highlightCss: function(css) {
      css = css.replace(/([.#]?[a-zA-Z][a-zA-Z0-9_-]{0,200})(\s*\{)/g, '<span class="code-selector">$1</span>$2');
      css = css.replace(/([a-zA-Z][a-zA-Z0-9_-]{0,200})(\s*:)/g, '<span class="code-property">$1</span>$2');
      css = css.replace(/:\s*([^;{}]+)(;)/g, ': <span class="code-value">$1</span>$2');
      css = css.replace(/(\d+)(px|rem|em|%|vh|vw|deg|s|ms)/g, '<span class="code-number">$1</span><span class="code-unit">$2</span>');
      css = css.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="code-comment">$1</span>');
      return css;
    },
    /**
     * Apply syntax highlighting to JavaScript
     * @param {string} js - JavaScript string
     * @returns {string} JS with syntax highlighting spans
     */
    highlightJs: function(js) {
      const keywords = ["const", "let", "var", "function", "return", "if", "else", "for", "while", "switch", "case", "break", "continue", "new", "this", "class", "extends", "import", "export", "default", "async", "await", "try", "catch", "throw", "typeof", "instanceof"];
      keywords.forEach((kw) => {
        const regex = new RegExp(`\\b(${kw})\\b`, "g");
        js = js.replace(regex, '<span class="code-keyword">$1</span>');
      });
      js = js.replace(/('(?:[^'\\]|\\.){0,10000}'|"(?:[^"\\]|\\.){0,10000}"|`(?:[^`\\]|\\.){0,10000}`)/g, '<span class="code-string">$1</span>');
      js = js.replace(/\b(\d+\.?\d*)\b/g, '<span class="code-number">$1</span>');
      js = js.replace(/\b([\w]+)(\s*\()/g, '<span class="code-function">$1</span>$2');
      js = js.replace(/(\/\/.*$)/gm, '<span class="code-comment">$1</span>');
      js = js.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="code-comment">$1</span>');
      return js;
    },
    /**
     * Add line numbers to a code pane
     * @param {HTMLElement} pane - Code pane element
     */
    addLineNumbers: function(pane) {
      const code = pane.querySelector("code");
      if (!code) return;
      const lines = code.innerHTML.split("\n");
      const lineCount = lines.length;
      const lineNumbers = document.createElement("div");
      lineNumbers.className = "vd-code-snippet-line-numbers";
      lineNumbers.setAttribute("aria-hidden", "true");
      for (let i = 1; i <= lineCount; i++) {
        const lineNum = document.createElement("span");
        lineNum.textContent = i;
        lineNumbers.appendChild(lineNum);
      }
      const codeWrapper = document.createElement("div");
      codeWrapper.className = "vd-code-snippet-code";
      codeWrapper.appendChild(code.cloneNode(true));
      code.parentNode.removeChild(code);
      pane.appendChild(lineNumbers);
      pane.appendChild(codeWrapper);
    },
    /**
     * Programmatically expand a code snippet
     * @param {string|HTMLElement} snippet - Snippet selector or element
     */
    expand: function(snippet) {
      if (typeof snippet === "string") {
        snippet = document.querySelector(snippet);
      }
      if (!snippet) return;
      snippet.dataset.expanded = "true";
      const toggle = snippet.querySelector(".vd-code-snippet-toggle");
      const content = snippet.querySelector(".vd-code-snippet-content");
      if (toggle) toggle.setAttribute("aria-expanded", "true");
      if (content) content.dataset.visible = "true";
    },
    /**
     * Programmatically collapse a code snippet
     * @param {string|HTMLElement} snippet - Snippet selector or element
     */
    collapse: function(snippet) {
      if (typeof snippet === "string") {
        snippet = document.querySelector(snippet);
      }
      if (!snippet) return;
      snippet.dataset.expanded = "false";
      const toggle = snippet.querySelector(".vd-code-snippet-toggle");
      const content = snippet.querySelector(".vd-code-snippet-content");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
      if (content) content.dataset.visible = "false";
    },
    /**
     * Programmatically switch to a specific language tab
     * @param {string|HTMLElement} snippet - Snippet selector or element
     * @param {string} lang - Language to switch to (html, css, js)
     */
    showLang: function(snippet, lang) {
      if (typeof snippet === "string") {
        snippet = document.querySelector(snippet);
      }
      if (!snippet) return;
      const tab = snippet.querySelector(`.vd-code-snippet-tab[data-lang="${lang}"]`);
      const tabs = snippet.querySelectorAll(".vd-code-snippet-tab");
      const panes = snippet.querySelectorAll(".vd-code-snippet-pane");
      if (tab) {
        this.switchTab(snippet, tab, tabs, panes);
      }
    },
    /**
     * Destroy a code snippet instance and clean up listeners
     * @param {string|HTMLElement} snippet - Snippet selector or element
     */
    destroy: function(snippet) {
      if (typeof snippet === "string") {
        snippet = document.querySelector(snippet);
      }
      if (!snippet) return;
      if (snippet._codeSnippetCleanup) {
        snippet._codeSnippetCleanup.forEach((fn) => fn());
        delete snippet._codeSnippetCleanup;
      }
      delete snippet.dataset.initialized;
    },
    /**
     * Destroy all code snippet instances
     */
    destroyAll: function() {
      const snippets = document.querySelectorAll('.vd-code-snippet[data-initialized="true"]');
      snippets.forEach((snippet) => this.destroy(snippet));
    }
  };
  if (typeof window.Vanduo !== "undefined") {
    window.Vanduo.register("codeSnippet", CodeSnippet);
  }
  window.CodeSnippet = CodeSnippet;
})();

// js/components/collapsible.js
(function() {
  "use strict";
  const Collapsible = {
    // Store initialized containers and their cleanup functions
    instances: /* @__PURE__ */ new Map(),
    /**
     * Initialize collapsible components
     */
    init: function() {
      const collapsibles = document.querySelectorAll(".vd-collapsible, .accordion");
      collapsibles.forEach((container) => {
        if (this.instances.has(container)) {
          return;
        }
        this.initCollapsible(container);
      });
    },
    /**
     * Initialize a collapsible container
     * @param {HTMLElement} container - Collapsible container
     */
    initCollapsible: function(container) {
      const isAccordion = container.classList.contains("accordion");
      const items = container.querySelectorAll(".vd-collapsible-item, .accordion-item");
      const cleanupFunctions = [];
      items.forEach((item) => {
        const header = item.querySelector(".vd-collapsible-header, .accordion-header");
        const body = item.querySelector(".vd-collapsible-body, .accordion-body");
        const trigger = item.querySelector(".vd-collapsible-trigger, .accordion-trigger") || header;
        if (!header || !body) {
          return;
        }
        if (item.classList.contains("is-open")) {
          this.openItem(item, body, false);
        } else {
          this.closeItem(item, body, false);
        }
        const clickHandler = (e) => {
          e.preventDefault();
          this.toggleItem(item, body, container, isAccordion);
        };
        trigger.addEventListener("click", clickHandler);
        cleanupFunctions.push(() => trigger.removeEventListener("click", clickHandler));
      });
      this.instances.set(container, { cleanup: cleanupFunctions });
    },
    /**
     * Toggle collapsible item
     * @param {HTMLElement} item - Collapsible item
     * @param {HTMLElement} body - Collapsible body
     * @param {HTMLElement} container - Collapsible container
     * @param {boolean} isAccordion - Whether in accordion mode
     */
    toggleItem: function(item, body, container, isAccordion) {
      const isOpen = item.classList.contains("is-open");
      if (isOpen) {
        this.closeItem(item, body);
      } else {
        if (isAccordion) {
          const otherOpenItems = container.querySelectorAll(".vd-collapsible-item.is-open, .accordion-item.is-open");
          otherOpenItems.forEach((otherItem) => {
            if (otherItem !== item) {
              const otherBody = otherItem.querySelector(".vd-collapsible-body, .accordion-body");
              this.closeItem(otherItem, otherBody);
            }
          });
        }
        this.openItem(item, body);
      }
    },
    /**
     * Open collapsible item
     * @param {HTMLElement} item - Collapsible item
     * @param {HTMLElement} body - Collapsible body
     * @param {boolean} animate - Whether to animate
     */
    openItem: function(item, body, animate = true) {
      if (!animate) {
        body.style.transition = "none";
      }
      item.classList.add("is-open");
      item.setAttribute("aria-expanded", "true");
      const height = body.scrollHeight;
      body.style.maxHeight = `${height}px`;
      if (!animate) {
        setTimeout(() => {
          body.style.transition = "";
        }, 0);
      }
      item.dispatchEvent(new CustomEvent("collapsible:open", { bubbles: true }));
    },
    /**
     * Close collapsible item
     * @param {HTMLElement} item - Collapsible item
     * @param {HTMLElement} body - Collapsible body
     * @param {boolean} animate - Whether to animate
     */
    closeItem: function(item, body, animate = true) {
      if (!animate) {
        body.style.transition = "none";
      }
      item.classList.remove("is-open");
      item.setAttribute("aria-expanded", "false");
      body.style.maxHeight = "0";
      if (!animate) {
        setTimeout(() => {
          body.style.transition = "";
        }, 0);
      }
      item.dispatchEvent(new CustomEvent("collapsible:close", { bubbles: true }));
    },
    /**
     * Open item programmatically
     * @param {HTMLElement|string} item - Collapsible item or selector
     */
    open: function(item) {
      const el = typeof item === "string" ? document.querySelector(item) : item;
      if (el) {
        const body = el.querySelector(".vd-collapsible-body, .accordion-body");
        if (body) {
          this.openItem(el, body);
        }
      }
    },
    /**
     * Close item programmatically
     * @param {HTMLElement|string} item - Collapsible item or selector
     */
    close: function(item) {
      const el = typeof item === "string" ? document.querySelector(item) : item;
      if (el) {
        const body = el.querySelector(".vd-collapsible-body, .accordion-body");
        if (body) {
          this.closeItem(el, body);
        }
      }
    },
    /**
     * Toggle item programmatically
     * @param {HTMLElement|string} item - Collapsible item or selector
     */
    toggle: function(item) {
      const el = typeof item === "string" ? document.querySelector(item) : item;
      if (el) {
        const body = el.querySelector(".vd-collapsible-body, .accordion-body");
        const container = el.closest(".vd-collapsible, .accordion");
        const isAccordion = container && container.classList.contains("accordion");
        if (body) {
          this.toggleItem(el, body, container, isAccordion);
        }
      }
    },
    /**
     * Destroy a collapsible instance and clean up event listeners
     * @param {HTMLElement} container - Collapsible container
     */
    destroy: function(container) {
      const instance = this.instances.get(container);
      if (!instance) return;
      instance.cleanup.forEach((fn) => fn());
      this.instances.delete(container);
    },
    /**
     * Destroy all collapsible instances
     */
    destroyAll: function() {
      this.instances.forEach((instance, container) => {
        this.destroy(container);
      });
    }
  };
  if (typeof window.Vanduo !== "undefined") {
    window.Vanduo.register("collapsible", Collapsible);
  }
  window.VanduoCollapsible = Collapsible;
})();

// js/components/dropdown.js
(function() {
  "use strict";
  const Dropdown = {
    // Store initialized dropdowns and their cleanup functions
    instances: /* @__PURE__ */ new Map(),
    // Typeahead state
    _typeaheadBuffer: "",
    _typeaheadTimer: null,
    /**
     * Initialize dropdown components
     */
    init: function() {
      const dropdowns = document.querySelectorAll(".vd-dropdown");
      dropdowns.forEach((dropdown) => {
        if (this.instances.has(dropdown)) {
          return;
        }
        this.initDropdown(dropdown);
      });
    },
    /**
     * Initialize a single dropdown
     * @param {HTMLElement} dropdown - Dropdown container
     */
    initDropdown: function(dropdown) {
      const toggle = dropdown.querySelector(".vd-dropdown-toggle");
      const menu = dropdown.querySelector(".vd-dropdown-menu");
      if (!toggle || !menu) {
        return;
      }
      const cleanupFunctions = [];
      toggle.setAttribute("aria-haspopup", "true");
      toggle.setAttribute("aria-expanded", "false");
      menu.setAttribute("role", "menu");
      menu.setAttribute("aria-hidden", "true");
      const toggleClickHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleDropdown(dropdown, toggle, menu);
      };
      toggle.addEventListener("click", toggleClickHandler);
      cleanupFunctions.push(() => toggle.removeEventListener("click", toggleClickHandler));
      const documentClickHandler = (e) => {
        if (!dropdown.contains(e.target) && menu.classList.contains("is-open")) {
          this.closeDropdown(dropdown, toggle, menu);
        }
      };
      document.addEventListener("click", documentClickHandler);
      cleanupFunctions.push(() => document.removeEventListener("click", documentClickHandler));
      const keydownHandler = (e) => {
        this.handleKeydown(e, dropdown, toggle, menu);
      };
      toggle.addEventListener("keydown", keydownHandler);
      cleanupFunctions.push(() => toggle.removeEventListener("keydown", keydownHandler));
      const items = menu.querySelectorAll(".vd-dropdown-item:not(.disabled):not(.is-disabled)");
      items.forEach((item) => {
        const itemClickHandler = (e) => {
          e.preventDefault();
          this.selectItem(item, dropdown, toggle, menu);
        };
        item.addEventListener("click", itemClickHandler);
        cleanupFunctions.push(() => item.removeEventListener("click", itemClickHandler));
        const itemKeydownHandler = (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            this.selectItem(item, dropdown, toggle, menu);
          }
        };
        item.addEventListener("keydown", itemKeydownHandler);
        cleanupFunctions.push(() => item.removeEventListener("keydown", itemKeydownHandler));
      });
      this.instances.set(dropdown, { toggle, menu, cleanup: cleanupFunctions });
    },
    /**
     * Toggle dropdown
     * @param {HTMLElement} dropdown - Dropdown container
     * @param {HTMLElement} toggle - Toggle button
     * @param {HTMLElement} menu - Dropdown menu
     */
    toggleDropdown: function(dropdown, toggle, menu) {
      const isOpen = menu.classList.contains("is-open");
      if (isOpen) {
        this.closeDropdown(dropdown, toggle, menu);
      } else {
        this.openDropdown(dropdown, toggle, menu);
      }
    },
    /**
     * Open dropdown
     * @param {HTMLElement} dropdown - Dropdown container
     * @param {HTMLElement} toggle - Toggle button
     * @param {HTMLElement} menu - Dropdown menu
     */
    openDropdown: function(dropdown, toggle, menu) {
      const otherOpen = document.querySelectorAll(".vd-dropdown-menu.is-open");
      otherOpen.forEach((otherMenu) => {
        if (otherMenu !== menu) {
          const otherDropdown = otherMenu.closest(".vd-dropdown");
          const otherToggle = otherDropdown.querySelector(".vd-dropdown-toggle");
          this.closeDropdown(otherDropdown, otherToggle, otherMenu);
        }
      });
      dropdown.classList.add("is-open");
      menu.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      menu.setAttribute("aria-hidden", "false");
      this.positionMenu(dropdown, menu);
      const firstItem = menu.querySelector(".vd-dropdown-item:not(.disabled):not(.is-disabled)");
      if (firstItem) {
        setTimeout(() => firstItem.focus(), 0);
      }
    },
    /**
     * Close dropdown
     * @param {HTMLElement} dropdown - Dropdown container
     * @param {HTMLElement} toggle - Toggle button
     * @param {HTMLElement} menu - Dropdown menu
     */
    closeDropdown: function(dropdown, toggle, menu) {
      dropdown.classList.remove("is-open");
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      menu.setAttribute("aria-hidden", "true");
      toggle.focus();
    },
    /**
     * Position dropdown menu
     * @param {HTMLElement} dropdown - Dropdown container
     * @param {HTMLElement} menu - Dropdown menu
     */
    positionMenu: function(dropdown, menu) {
      const rect = dropdown.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 8;
      if (rect.left + menuRect.width > viewportWidth - padding) {
        menu.classList.add("vd-dropdown-menu-end");
        menu.classList.remove("vd-dropdown-menu-start");
      }
      if (menu.classList.contains("dropdown-menu-top")) {
        if (rect.top - menuRect.height < padding) {
          menu.classList.remove("vd-dropdown-menu-top");
        }
      } else {
        if (rect.bottom + menuRect.height > viewportHeight - padding) {
          menu.classList.add("vd-dropdown-menu-top");
        }
      }
    },
    /**
     * Handle keyboard navigation
     * @param {KeyboardEvent} e - Keyboard event
     * @param {HTMLElement} dropdown - Dropdown container
     * @param {HTMLElement} toggle - Toggle button
     * @param {HTMLElement} menu - Dropdown menu
     */
    handleKeydown: function(e, dropdown, toggle, menu) {
      const isOpen = menu.classList.contains("is-open");
      const items = Array.from(menu.querySelectorAll(".vd-dropdown-item:not(.disabled):not(.is-disabled)"));
      const currentIndex = items.findIndex((item) => item === document.activeElement);
      switch (e.key) {
        case "Enter":
        case " ":
        case "ArrowDown":
          e.preventDefault();
          if (!isOpen) {
            this.openDropdown(dropdown, toggle, menu);
          } else if (e.key === "ArrowDown") {
            const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
            items[nextIndex].focus();
          }
          break;
        case "ArrowUp":
          if (isOpen) {
            e.preventDefault();
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
            items[prevIndex].focus();
          }
          break;
        case "Escape":
          if (isOpen) {
            e.preventDefault();
            this.closeDropdown(dropdown, toggle, menu);
          }
          break;
        case "Home":
          if (isOpen) {
            e.preventDefault();
            items[0].focus();
          }
          break;
        case "End":
          if (isOpen) {
            e.preventDefault();
            items[items.length - 1].focus();
          }
          break;
        default:
          if (isOpen && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            clearTimeout(this._typeaheadTimer);
            this._typeaheadBuffer += e.key.toLowerCase();
            const match = items.find(
              (item) => item.textContent.trim().toLowerCase().startsWith(this._typeaheadBuffer)
            );
            if (match) {
              match.focus();
            }
            this._typeaheadTimer = setTimeout(() => {
              this._typeaheadBuffer = "";
            }, 500);
          }
          break;
      }
    },
    /**
     * Select dropdown item
     * @param {HTMLElement} item - Dropdown item
     * @param {HTMLElement} dropdown - Dropdown container
     * @param {HTMLElement} toggle - Toggle button
     * @param {HTMLElement} menu - Dropdown menu
     */
    selectItem: function(item, dropdown, toggle, menu) {
      menu.querySelectorAll(".vd-dropdown-item").forEach((i) => {
        i.classList.remove("active", "is-active");
      });
      item.classList.add("active", "is-active");
      if (toggle.tagName === "BUTTON" || toggle.classList.contains("btn")) {
        toggle.textContent = item.textContent.trim();
      }
      this.closeDropdown(dropdown, toggle, menu);
      item.dispatchEvent(new CustomEvent("dropdown:select", {
        bubbles: true,
        detail: { item, value: item.dataset.value || item.textContent }
      }));
    },
    /**
     * Open dropdown programmatically
     * @param {HTMLElement|string} dropdown - Dropdown container or selector
     */
    open: function(dropdown) {
      const el = typeof dropdown === "string" ? document.querySelector(dropdown) : dropdown;
      if (el) {
        const toggle = el.querySelector(".vd-dropdown-toggle");
        const menu = el.querySelector(".vd-dropdown-menu");
        if (toggle && menu) {
          this.openDropdown(el, toggle, menu);
        }
      }
    },
    /**
     * Close dropdown programmatically
     * @param {HTMLElement|string} dropdown - Dropdown container or selector
     */
    close: function(dropdown) {
      const el = typeof dropdown === "string" ? document.querySelector(dropdown) : dropdown;
      if (el) {
        const toggle = el.querySelector(".vd-dropdown-toggle");
        const menu = el.querySelector(".vd-dropdown-menu");
        if (toggle && menu) {
          this.closeDropdown(el, toggle, menu);
        }
      }
    },
    /**
     * Destroy a dropdown instance and clean up event listeners
     * @param {HTMLElement} dropdown - Dropdown element
     */
    destroy: function(dropdown) {
      const instance = this.instances.get(dropdown);
      if (!instance) return;
      instance.cleanup.forEach((fn) => fn());
      this.instances.delete(dropdown);
    },
    /**
     * Destroy all dropdown instances
     */
    destroyAll: function() {
      this.instances.forEach((instance, dropdown) => {
        this.destroy(dropdown);
      });
    }
  };
  if (typeof window.Vanduo !== "undefined") {
    window.Vanduo.register("dropdown", Dropdown);
  }
  window.VanduoDropdown = Dropdown;
})();

// js/components/font-switcher.js
(function() {
  "use strict";
  const FontSwitcher = {
    STORAGE_KEY: "vanduo-font-preference",
    isInitialized: false,
    // Available fonts configuration
    fonts: {
      "system": {
        name: "System Default",
        family: null
        // Uses CSS default
      },
      "inter": {
        name: "Inter",
        family: "'Inter', sans-serif"
      },
      "source-sans": {
        name: "Source Sans 3",
        family: "'Source Sans 3', sans-serif"
      },
      "fira-sans": {
        name: "Fira Sans",
        family: "'Fira Sans', sans-serif"
      },
      "ibm-plex": {
        name: "IBM Plex Sans",
        family: "'IBM Plex Sans', sans-serif"
      },
      "jetbrains-mono": {
        name: "JetBrains Mono",
        family: "'JetBrains Mono', monospace"
      },
      "ubuntu": {
        name: "Ubuntu",
        family: "'Ubuntu', sans-serif",
        category: "sans-serif",
        description: "Friendly, humanist sans-serif"
      },
      "open-sans": {
        name: "Open Sans",
        family: "'Open Sans', sans-serif",
        category: "sans-serif",
        description: "Neutral, highly readable"
      },
      "rubik": {
        name: "Rubik",
        family: "'Rubik', sans-serif",
        category: "sans-serif",
        description: "Modern, geometric"
      },
      "titillium-web": {
        name: "Titillium Web",
        family: "'Titillium Web', sans-serif",
        category: "sans-serif",
        description: "Technical, elegant"
      }
    },
    init: function() {
      this.state = {
        preference: this.getPreference()
      };
      if (this.isInitialized) {
        this.applyFont();
        this.renderUI();
        this.updateUI();
        return;
      }
      this.isInitialized = true;
      this.applyFont();
      this.renderUI();
      console.log("Vanduo Font Switcher initialized");
    },
    /**
     * Get saved font preference from localStorage
     * @returns {string} Font key or 'ubuntu' (default)
     */
    getPreference: function() {
      return this.getStorageValue(this.STORAGE_KEY, "ubuntu");
    },
    /**
     * Set font preference and apply it
     * @param {string} fontKey - The font key to apply
     */
    setPreference: function(fontKey) {
      if (!this.fonts[fontKey]) {
        console.warn("Unknown font:", fontKey);
        return;
      }
      this.state.preference = fontKey;
      this.setStorageValue(this.STORAGE_KEY, fontKey);
      this.applyFont();
      this.updateUI();
      const event = new CustomEvent("font:change", {
        bubbles: true,
        detail: { font: fontKey, fontData: this.fonts[fontKey] }
      });
      document.dispatchEvent(event);
    },
    /**
     * Apply the current font preference to the document
     */
    applyFont: function() {
      const fontKey = this.state.preference;
      if (fontKey === "system") {
        document.documentElement.removeAttribute("data-font");
      } else {
        document.documentElement.setAttribute("data-font", fontKey);
      }
    },
    /**
     * Initialize UI elements with data-toggle="font"
     */
    renderUI: function() {
      const toggles = document.querySelectorAll('[data-toggle="font"]');
      toggles.forEach((toggle) => {
        if (toggle.getAttribute("data-font-initialized") === "true") {
          if (toggle.tagName === "SELECT") {
            toggle.value = this.state.preference;
          }
          return;
        }
        if (toggle.tagName === "SELECT") {
          toggle.value = this.state.preference;
          const onChange = (e) => {
            this.setPreference(e.target.value);
          };
          toggle.addEventListener("change", onChange);
          toggle._fontToggleHandler = onChange;
        } else {
          const onClick = () => {
            const fontKeys = Object.keys(this.fonts);
            const currentIndex = fontKeys.indexOf(this.state.preference);
            const nextIndex = (currentIndex + 1) % fontKeys.length;
            this.setPreference(fontKeys[nextIndex]);
          };
          toggle.addEventListener("click", onClick);
          toggle._fontToggleHandler = onClick;
        }
        toggle.setAttribute("data-font-initialized", "true");
      });
    },
    /**
     * Update all UI elements to reflect current state
     */
    updateUI: function() {
      const toggles = document.querySelectorAll('[data-toggle="font"]');
      toggles.forEach((toggle) => {
        if (toggle.tagName === "SELECT") {
          toggle.value = this.state.preference;
        } else {
          const label = toggle.querySelector(".font-current-label");
          if (label) {
            label.textContent = this.fonts[this.state.preference].name;
          }
        }
      });
    },
    /**
     * Get the current font preference
     * @returns {string} Current font key
     */
    getCurrentFont: function() {
      return this.state.preference;
    },
    /**
     * Get font data for a given key
     * @param {string} fontKey - The font key
     * @returns {Object|null} Font data or null
     */
    getFontData: function(fontKey) {
      return this.fonts[fontKey] || null;
    },
    destroyAll: function() {
      const toggles = document.querySelectorAll('[data-toggle="font"][data-font-initialized="true"]');
      toggles.forEach((toggle) => {
        if (toggle._fontToggleHandler) {
          const eventName = toggle.tagName === "SELECT" ? "change" : "click";
          toggle.removeEventListener(eventName, toggle._fontToggleHandler);
          delete toggle._fontToggleHandler;
        }
        toggle.removeAttribute("data-font-initialized");
      });
      this.isInitialized = false;
    },
    getStorageValue: function(key, fallback) {
      if (typeof window.safeStorageGet === "function") {
        return window.safeStorageGet(key, fallback);
      }
      try {
        const value = localStorage.getItem(key);
        return value !== null ? value : fallback;
      } catch (_e) {
        return fallback;
      }
    },
    setStorageValue: function(key, value) {
      if (typeof window.safeStorageSet === "function") {
        return window.safeStorageSet(key, value);
      }
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (_e) {
        return false;
      }
    }
  };
  if (window.Vanduo) {
    window.Vanduo.register("fontSwitcher", FontSwitcher);
  }
  window.FontSwitcher = FontSwitcher;
})();

// js/components/grid.js
(function() {
  "use strict";
  const supportsHas = (function() {
    try {
      return CSS.supports("selector(:has(*))");
    } catch (_e) {
      return false;
    }
  })();
  const GridLayout = {
    instances: /* @__PURE__ */ new Map(),
    /**
     * Initialize all grid layout containers
     */
    init: function() {
      const containers = document.querySelectorAll("[data-layout-mode]");
      containers.forEach(function(container) {
        if (this.instances.has(container)) {
          return;
        }
        this.initContainer(container);
      }.bind(this));
      this.initToggleButtons();
    },
    /**
     * Initialize a single grid container
     * @param {HTMLElement} container - Element with data-layout-mode
     */
    initContainer: function(container) {
      const mode = container.getAttribute("data-layout-mode") || "standard";
      const cleanupFunctions = [];
      this.applyMode(container, mode);
      container.setAttribute("role", "region");
      container.setAttribute("aria-label", "Grid layout: " + mode + " mode");
      this.instances.set(container, {
        cleanup: cleanupFunctions,
        mode
      });
    },
    /**
     * Initialize toggle buttons that target grid containers
     */
    initToggleButtons: function() {
      const toggleButtons = document.querySelectorAll("[data-grid-toggle]");
      toggleButtons.forEach(function(button) {
        if (button.getAttribute("data-grid-initialized") === "true") {
          return;
        }
        const clickHandler = function(e) {
          e.preventDefault();
          const targetSelector = button.getAttribute("data-grid-toggle");
          let target;
          if (targetSelector) {
            target = document.querySelector(targetSelector);
          } else {
            target = button.closest("[data-layout-mode]");
          }
          if (target) {
            this.toggle(target);
          }
        }.bind(this);
        button.addEventListener("click", clickHandler);
        button.setAttribute("data-grid-initialized", "true");
        button.setAttribute("aria-pressed", "false");
        button._gridCleanup = function() {
          button.removeEventListener("click", clickHandler);
          button.removeAttribute("data-grid-initialized");
          button.removeAttribute("aria-pressed");
        };
      }.bind(this));
    },
    /**
     * Apply Fibonacci grid-template-columns inline for browsers without :has()
     * @param {HTMLElement} container - Grid container
     */
    applyFibFallback: function(container) {
      if (supportsHas) return;
      const rows = container.querySelectorAll(".vd-row, .row");
      rows.forEach(function(row) {
        const cols = row.querySelectorAll(':scope > [class*="vd-col-"], :scope > [class*="col-"]');
        const count = cols.length;
        if (count === 1) {
          row.style.gridTemplateColumns = "1fr";
        } else if (count === 2) {
          row.style.gridTemplateColumns = "1fr 1.618fr";
        } else if (count === 3) {
          row.style.gridTemplateColumns = "2fr 3fr 5fr";
        } else if (count === 4) {
          row.style.gridTemplateColumns = "1fr 2fr 3fr 5fr";
        } else {
          row.style.gridTemplateColumns = "repeat(" + count + ", 1fr)";
        }
      });
    },
    /**
     * Remove inline grid-template-columns fallback
     * @param {HTMLElement} container - Grid container
     */
    removeFibFallback: function(container) {
      const rows = container.querySelectorAll(".vd-row, .row");
      rows.forEach(function(row) {
        row.style.gridTemplateColumns = "";
      });
    },
    /**
     * Apply a layout mode to a container
     * @param {HTMLElement} container - Target container
     * @param {string} mode - 'fibonacci' or 'standard'
     */
    applyMode: function(container, mode) {
      container.classList.remove("vd-grid-standard", "vd-grid-fibonacci");
      if (mode === "fibonacci") {
        container.classList.add("vd-grid-fibonacci");
        this.applyFibFallback(container);
      } else {
        container.classList.add("vd-grid-standard");
        this.removeFibFallback(container);
      }
      container.setAttribute("data-layout-mode", mode);
      container.setAttribute("aria-label", "Grid layout: " + mode + " mode");
      const toggleButtons = document.querySelectorAll("[data-grid-toggle]");
      toggleButtons.forEach(function(btn) {
        const targetSelector = btn.getAttribute("data-grid-toggle");
        if (targetSelector && container.matches(targetSelector)) {
          const isActive = mode === "fibonacci";
          if (isActive) {
            btn.classList.add("is-active");
          } else {
            btn.classList.remove("is-active");
          }
          btn.setAttribute("aria-pressed", isActive ? "true" : "false");
        }
      });
      const instance = this.instances.get(container);
      if (instance) {
        instance.mode = mode;
      }
      let event;
      try {
        event = new CustomEvent("grid:modechange", {
          bubbles: true,
          detail: {
            container,
            mode
          }
        });
      } catch (_e) {
        event = document.createEvent("CustomEvent");
        event.initCustomEvent("grid:modechange", true, true, {
          container,
          mode
        });
      }
      container.dispatchEvent(event);
    },
    /**
     * Toggle between standard and fibonacci modes
     * @param {HTMLElement|string} container - Container element or selector
     */
    toggle: function(container) {
      if (typeof container === "string") {
        container = document.querySelector(container);
      }
      if (!container) return;
      const currentMode = container.getAttribute("data-layout-mode") || "standard";
      const newMode = currentMode === "fibonacci" ? "standard" : "fibonacci";
      this.applyMode(container, newMode);
    },
    /**
     * Set a specific mode
     * @param {HTMLElement|string} container - Container element or selector
     * @param {string} mode - 'fibonacci' or 'standard'
     */
    setMode: function(container, mode) {
      if (typeof container === "string") {
        container = document.querySelector(container);
      }
      if (!container) return;
      if (mode !== "fibonacci" && mode !== "standard") return;
      this.applyMode(container, mode);
    },
    /**
     * Get the current mode of a container
     * @param {HTMLElement|string} container - Container element or selector
     * @returns {string|null} Current mode or null
     */
    getMode: function(container) {
      if (typeof container === "string") {
        container = document.querySelector(container);
      }
      if (!container) return null;
      return container.getAttribute("data-layout-mode") || "standard";
    },
    /**
     * Destroy a single grid layout instance
     * @param {HTMLElement} container - Grid container
     */
    destroy: function(container) {
      const instance = this.instances.get(container);
      if (!instance) return;
      instance.cleanup.forEach(function(fn) {
        fn();
      });
      container.classList.remove("vd-grid-standard", "vd-grid-fibonacci");
      container.removeAttribute("aria-label");
      this.removeFibFallback(container);
      this.instances.delete(container);
    },
    /**
     * Destroy all grid layout instances and clean up toggle buttons
     */
    destroyAll: function() {
      this.instances.forEach(function(instance, container) {
        this.destroy(container);
      }.bind(this));
      const toggleButtons = document.querySelectorAll('[data-grid-initialized="true"]');
      toggleButtons.forEach(function(button) {
        if (button._gridCleanup) {
          button._gridCleanup();
          delete button._gridCleanup;
        }
      });
    }
  };
  if (typeof window.Vanduo !== "undefined") {
    window.Vanduo.register("gridLayout", GridLayout);
  }
  window.VanduoGridLayout = GridLayout;
})();

// js/components/image-box.js
(function() {
  "use strict";
  const ImageBox = {
    backdrop: null,
    container: null,
    img: null,
    closeBtn: null,
    caption: null,
    currentTrigger: null,
    scrollThreshold: 50,
    initialScrollY: 0,
    isOpen: false,
    // Store cleanup functions for event listeners
    _cleanupFunctions: [],
    /**
     * Initialize Image Box component
     */
    init: function() {
      this.createBackdrop();
      this.bindTriggers();
    },
    /**
     * Create backdrop elements
     */
    createBackdrop: function() {
      if (this.backdrop || document.querySelector(".vd-image-box-backdrop")) {
        if (!this.backdrop) {
          this.backdrop = document.querySelector(".vd-image-box-backdrop");
          this.container = this.backdrop.querySelector(".vd-image-box-container");
          this.img = this.backdrop.querySelector(".vd-image-box-img");
          this.closeBtn = this.backdrop.querySelector(".vd-image-box-close");
          this.caption = this.backdrop.querySelector(".vd-image-box-caption");
          this.bindBackdropEvents();
        }
        return;
      }
      this.backdrop = document.createElement("div");
      this.backdrop.className = "vd-image-box-backdrop";
      this.backdrop.setAttribute("role", "dialog");
      this.backdrop.setAttribute("aria-modal", "true");
      this.backdrop.setAttribute("aria-label", "Image viewer");
      this.backdrop.setAttribute("tabindex", "-1");
      this.container = document.createElement("div");
      this.container.className = "vd-image-box-container";
      this.img = document.createElement("img");
      this.img.className = "vd-image-box-img";
      this.img.alt = "";
      this.closeBtn = document.createElement("button");
      this.closeBtn.className = "vd-image-box-close";
      this.closeBtn.setAttribute("aria-label", "Close image viewer");
      this.closeBtn.innerHTML = "&times;";
      this.caption = document.createElement("div");
      this.caption.className = "vd-image-box-caption";
      this.container.appendChild(this.img);
      this.backdrop.appendChild(this.closeBtn);
      this.backdrop.appendChild(this.container);
      this.backdrop.appendChild(this.caption);
      document.body.appendChild(this.backdrop);
      this.bindBackdropEvents();
    },
    /**
     * Bind events to backdrop elements
     */
    bindBackdropEvents: function() {
      const self = this;
      const backdropClickHandler = function(e) {
        if (e.target === self.backdrop || e.target === self.container) {
          self.close();
        }
      };
      this.backdrop.addEventListener("click", backdropClickHandler);
      this._cleanupFunctions.push(() => this.backdrop.removeEventListener("click", backdropClickHandler));
      const imgClickHandler = function() {
        self.close();
      };
      this.img.addEventListener("click", imgClickHandler);
      this._cleanupFunctions.push(() => this.img.removeEventListener("click", imgClickHandler));
      const closeBtnHandler = function() {
        self.close();
      };
      this.closeBtn.addEventListener("click", closeBtnHandler);
      this._cleanupFunctions.push(() => this.closeBtn.removeEventListener("click", closeBtnHandler));
      const escHandler = function(e) {
        if (e.key === "Escape" && self.isOpen) {
          self.close();
        }
      };
      document.addEventListener("keydown", escHandler);
      this._cleanupFunctions.push(() => document.removeEventListener("keydown", escHandler));
      const scrollHandler = function() {
        if (!self.isOpen) return;
        const currentScrollY = window.scrollY;
        const scrollDelta = Math.abs(currentScrollY - self.initialScrollY);
        if (scrollDelta > self.scrollThreshold) {
          self.close();
        }
      };
      window.addEventListener("scroll", scrollHandler, { passive: true });
      this._cleanupFunctions.push(() => window.removeEventListener("scroll", scrollHandler));
    },
    /**
     * Bind triggers to all images with data-image-box attribute
     */
    bindTriggers: function() {
      const self = this;
      const triggers = document.querySelectorAll("[data-image-box]");
      triggers.forEach(function(trigger) {
        if (trigger.dataset.imageBoxInitialized) return;
        trigger.dataset.imageBoxInitialized = "true";
        trigger.classList.add("vd-image-box-trigger");
        if (trigger.tagName === "IMG") {
          if (trigger.complete && trigger.naturalWidth === 0) {
            trigger.classList.add("is-broken");
          }
          const errorHandler = function() {
            trigger.classList.add("is-broken");
          };
          trigger.addEventListener("error", errorHandler);
          const loadHandler = function() {
            trigger.classList.remove("is-broken");
          };
          trigger.addEventListener("load", loadHandler);
        }
        const clickHandler = function(e) {
          e.preventDefault();
          self.open(trigger);
        };
        trigger.addEventListener("click", clickHandler);
        trigger._imageBoxCleanup = () => trigger.removeEventListener("click", clickHandler);
        if (trigger.tagName !== "BUTTON" && trigger.tagName !== "A") {
          trigger.setAttribute("role", "button");
          trigger.setAttribute("tabindex", "0");
          trigger.setAttribute("aria-label", "View enlarged image");
          const keyHandler = function(e) {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              self.open(trigger);
            }
          };
          trigger.addEventListener("keydown", keyHandler);
          const originalCleanup = trigger._imageBoxCleanup;
          trigger._imageBoxCleanup = () => {
            originalCleanup();
            trigger.removeEventListener("keydown", keyHandler);
          };
        }
      });
    },
    /**
     * Open image box
     * @param {HTMLElement} trigger - The trigger element
     */
    open: function(trigger) {
      if (this.isOpen) return;
      this.currentTrigger = trigger;
      this.isOpen = true;
      this.initialScrollY = window.scrollY;
      const imgSrc = trigger.dataset.imageBoxFullSrc || trigger.dataset.imageBoxSrc || trigger.src || trigger.href;
      if (!imgSrc) {
        console.warn("[Vanduo ImageBox] No image source found for trigger:", trigger);
        return;
      }
      const captionText = trigger.dataset.imageBoxCaption || trigger.alt || "";
      this.img.src = imgSrc;
      this.img.alt = trigger.alt || "";
      if (captionText) {
        this.caption.textContent = captionText;
        this.caption.style.display = "block";
      } else {
        this.caption.style.display = "none";
      }
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.setProperty("--scrollbar-width", `${scrollbarWidth}px`);
      document.body.classList.add("body-image-box-open");
      this.backdrop.classList.add("is-visible");
      this.backdrop.focus();
      trigger.dispatchEvent(new CustomEvent("imageBox:open", {
        bubbles: true,
        detail: { src: imgSrc }
      }));
      if (!this.img.complete) {
        this.img.style.opacity = "0";
        this.img.onload = () => {
          this.img.style.opacity = "";
        };
      }
    },
    /**
     * Close image box
     */
    close: function() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.backdrop.classList.remove("is-visible");
      document.body.classList.remove("body-image-box-open");
      document.body.style.removeProperty("--scrollbar-width");
      if (this.currentTrigger) {
        this.currentTrigger.focus();
        this.currentTrigger.dispatchEvent(new CustomEvent("imageBox:close", { bubbles: true }));
        this.currentTrigger = null;
      }
      setTimeout(() => {
        if (!this.isOpen) {
          this.img.src = "";
          this.img.alt = "";
        }
      }, 300);
    },
    /**
     * Reinitialize - useful after dynamic DOM changes
     */
    reinit: function() {
      this.bindTriggers();
    },
    /**
     * Destroy component and clean up
     */
    destroy: function() {
      if (this.isOpen) {
        this.close();
      }
      if (this.backdrop && this.backdrop.parentNode) {
        this.backdrop.parentNode.removeChild(this.backdrop);
      }
      this._cleanupFunctions.forEach((fn) => fn());
      this._cleanupFunctions = [];
      const triggers = document.querySelectorAll("[data-image-box-initialized]");
      triggers.forEach((trigger) => {
        trigger.classList.remove("vd-image-box-trigger");
        if (trigger._imageBoxCleanup) {
          trigger._imageBoxCleanup();
          delete trigger._imageBoxCleanup;
        }
        delete trigger.dataset.imageBoxInitialized;
      });
      this.backdrop = null;
      this.container = null;
      this.img = null;
      this.closeBtn = null;
      this.caption = null;
      this.currentTrigger = null;
      this.isOpen = false;
    },
    destroyAll: function() {
      this.destroy();
    }
  };
  if (typeof window.Vanduo !== "undefined") {
    window.Vanduo.register("imageBox", ImageBox);
  }
  window.VanduoImageBox = ImageBox;
})();

// js/components/modals.js
(function() {
  "use strict";
  const Modals = {
    modals: /* @__PURE__ */ new Map(),
    openModals: [],
    zIndexCounter: 1050,
    // Store trigger cleanup functions
    _triggerCleanups: [],
    /**
     * Initialize modals
     */
    init: function() {
      const modals = document.querySelectorAll(".vd-modal");
      modals.forEach((modal) => {
        if (this.modals.has(modal)) {
          return;
        }
        this.initModal(modal);
      });
      const triggers = document.querySelectorAll("[data-modal]");
      triggers.forEach((trigger) => {
        if (trigger.dataset.modalTriggerInitialized) return;
        trigger.dataset.modalTriggerInitialized = "true";
        const triggerClickHandler = (e) => {
          e.preventDefault();
          const modalId = trigger.dataset.modal;
          const modal = document.querySelector(modalId);
          if (modal) {
            this.open(modal);
          }
        };
        trigger.addEventListener("click", triggerClickHandler);
        this._triggerCleanups.push(() => trigger.removeEventListener("click", triggerClickHandler));
      });
    },
    /**
     * Initialize a single modal
     * @param {HTMLElement} modal - Modal element
     */
    initModal: function(modal) {
      const backdrop = this.createBackdrop(modal);
      const closeButtons = modal.querySelectorAll('.vd-modal-close, [data-dismiss="modal"]');
      const dialog = modal.querySelector(".vd-modal-dialog");
      if (!dialog) {
        return;
      }
      const cleanupFunctions = [];
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-hidden", "true");
      if (!modal.id) {
        modal.id = "modal-" + Math.random().toString(36).substr(2, 9);
      }
      const title = modal.querySelector(".vd-modal-title");
      if (title && !title.id) {
        title.id = modal.id + "-title";
        modal.setAttribute("aria-labelledby", title.id);
      }
      closeButtons.forEach((button) => {
        const closeHandler = () => {
          this.close(modal);
        };
        button.addEventListener("click", closeHandler);
        cleanupFunctions.push(() => button.removeEventListener("click", closeHandler));
      });
      const backdropClickHandler = (e) => {
        if (e.target === backdrop && modal.dataset.backdrop !== "static") {
          this.close(modal);
        }
      };
      backdrop.addEventListener("click", backdropClickHandler);
      cleanupFunctions.push(() => backdrop.removeEventListener("click", backdropClickHandler));
      const escKeyHandler = (e) => {
        if (e.key === "Escape" && this.openModals.length > 0) {
          const topModal = this.openModals[this.openModals.length - 1];
          if (topModal === modal && topModal.dataset.keyboard !== "false") {
            this.close(topModal);
          }
        }
      };
      document.addEventListener("keydown", escKeyHandler);
      cleanupFunctions.push(() => document.removeEventListener("keydown", escKeyHandler));
      this.modals.set(modal, { backdrop, dialog, trapHandler: null, cleanup: cleanupFunctions });
    },
    /**
     * Create backdrop element
     * @param {HTMLElement} modal - Modal element
     * @returns {HTMLElement} Backdrop element
     */
    createBackdrop: function(modal) {
      let backdrop = modal.querySelector(".vd-modal-backdrop");
      if (!backdrop) {
        backdrop = document.createElement("div");
        backdrop.className = "vd-modal-backdrop";
        document.body.appendChild(backdrop);
      }
      return backdrop;
    },
    /**
     * Open modal
     * @param {HTMLElement|string} modal - Modal element or selector
     */
    open: function(modal) {
      const el = typeof modal === "string" ? document.querySelector(modal) : modal;
      if (!el) {
        console.warn("[Vanduo Modals] Modal element not found:", modal);
        return;
      }
      if (!this.modals.has(el)) {
        console.warn("[Vanduo Modals] Modal not initialized:", el);
        return;
      }
      const modalData = this.modals.get(el);
      const { backdrop, dialog: _dialog } = modalData;
      this.zIndexCounter += 10;
      el.style.zIndex = this.zIndexCounter;
      backdrop.style.zIndex = this.zIndexCounter - 1;
      this.openModals.push(el);
      backdrop.classList.add("is-visible");
      el.classList.add("is-open");
      el.setAttribute("aria-hidden", "false");
      if (this.openModals.length === 1) {
        document.body.classList.add("body-modal-open");
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) {
          document.body.style.paddingRight = `${scrollbarWidth}px`;
        }
      }
      const trapHandler = this.trapFocus(el);
      modalData.trapHandler = trapHandler;
      setTimeout(() => {
        const firstFocusable = this.getFocusableElements(el)[0];
        if (firstFocusable) {
          firstFocusable.focus();
        }
      }, 100);
      el.dispatchEvent(new CustomEvent("modal:open", { bubbles: true }));
    },
    /**
     * Close modal
     * @param {HTMLElement|string} modal - Modal element or selector
     */
    close: function(modal) {
      const el = typeof modal === "string" ? document.querySelector(modal) : modal;
      if (!el) {
        console.warn("[Vanduo Modals] Modal element not found:", modal);
        return;
      }
      if (!this.modals.has(el)) {
        console.warn("[Vanduo Modals] Modal not initialized:", el);
        return;
      }
      const modalData = this.modals.get(el);
      const { backdrop, trapHandler } = modalData;
      if (trapHandler) {
        el.removeEventListener("keydown", trapHandler);
        modalData.trapHandler = null;
      }
      const index = this.openModals.indexOf(el);
      if (index > -1) {
        this.openModals.splice(index, 1);
      }
      el.classList.remove("is-open");
      el.setAttribute("aria-hidden", "true");
      if (this.openModals.length === 0) {
        backdrop.classList.remove("is-visible");
        document.body.classList.remove("body-modal-open");
        document.body.style.paddingRight = "";
        this.zIndexCounter = 1050;
      } else {
        const topModal = this.openModals[this.openModals.length - 1];
        const topBackdrop = this.modals.get(topModal).backdrop;
        topBackdrop.classList.add("is-visible");
      }
      const trigger = document.querySelector(`[data-modal="#${el.id}"]`);
      if (trigger) {
        trigger.focus();
      }
      el.dispatchEvent(new CustomEvent("modal:close", { bubbles: true }));
    },
    /**
     * Trap focus within modal
     * @param {HTMLElement} modal - Modal element
     * @returns {Function} The trap handler function for cleanup
     */
    trapFocus: function(modal) {
      const self = this;
      const trapHandler = function(e) {
        if (e.key !== "Tab") {
          return;
        }
        const focusableElements = self.getFocusableElements(modal);
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };
      modal.addEventListener("keydown", trapHandler);
      return trapHandler;
    },
    /**
     * Get focusable elements within modal
     * @param {HTMLElement} modal - Modal element
     * @returns {Array<HTMLElement>} Focusable elements
     */
    getFocusableElements: function(modal) {
      const selector = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
      return Array.from(modal.querySelectorAll(selector)).filter((el) => {
        return !el.hasAttribute("disabled") && el.offsetWidth > 0 && el.offsetHeight > 0;
      });
    },
    /**
     * Toggle modal
     * @param {HTMLElement|string} modal - Modal element or selector
     */
    toggle: function(modal) {
      const el = typeof modal === "string" ? document.querySelector(modal) : modal;
      if (el) {
        if (el.classList.contains("is-open")) {
          this.close(el);
        } else {
          this.open(el);
        }
      }
    },
    /**
     * Destroy a modal instance and clean up event listeners
     * @param {HTMLElement} modal - Modal element
     */
    destroy: function(modal) {
      const modalData = this.modals.get(modal);
      if (!modalData) return;
      if (modal.classList.contains("is-open")) {
        this.close(modal);
      }
      if (modalData.cleanup) {
        modalData.cleanup.forEach((fn) => fn());
      }
      if (modalData.backdrop && modalData.backdrop.parentNode) {
        modalData.backdrop.parentNode.removeChild(modalData.backdrop);
      }
      this.modals.delete(modal);
    },
    /**
     * Destroy all modal instances
     */
    destroyAll: function() {
      this.modals.forEach((data, modal) => {
        this.destroy(modal);
      });
      this._triggerCleanups.forEach((fn) => fn());
      this._triggerCleanups = [];
    }
  };
  if (typeof window.Vanduo !== "undefined") {
    window.Vanduo.register("modals", Modals);
  }
  window.VanduoModals = Modals;
})();

// js/components/navbar.js
(function() {
  "use strict";
  const Navbar = {
    // Store initialized navbars and their cleanup functions
    instances: /* @__PURE__ */ new Map(),
    /**
     * Get the breakpoint value from CSS variable or use fallback
     * @returns {number} Breakpoint in pixels
     */
    getBreakpoint: function() {
      const root = getComputedStyle(document.documentElement);
      const breakpointValue = root.getPropertyValue("--breakpoint-lg").trim();
      const parsed = parseInt(breakpointValue, 10);
      return isNaN(parsed) ? 992 : parsed;
    },
    /**
     * Initialize navbar component
     */
    init: function() {
      const navbars = document.querySelectorAll(".vd-navbar");
      navbars.forEach((navbar) => {
        if (this.instances.has(navbar)) {
          return;
        }
        this.initNavbar(navbar);
      });
    },
    /**
     * Initialize a single navbar
     * @param {HTMLElement} navbar - Navbar element
     */
    initNavbar: function(navbar) {
      const toggle = navbar.querySelector(".vd-navbar-toggle, .vd-navbar-burger");
      const menu = navbar.querySelector(".vd-navbar-menu");
      const overlay = navbar.querySelector(".vd-navbar-overlay") || this.createOverlay(navbar);
      if (!toggle || !menu) {
        return;
      }
      const cleanupFunctions = [];
      const toggleClickHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleMenu(navbar, toggle, menu, overlay);
      };
      toggle.addEventListener("click", toggleClickHandler);
      cleanupFunctions.push(() => toggle.removeEventListener("click", toggleClickHandler));
      if (overlay) {
        const overlayClickHandler = () => {
          this.closeMenu(navbar, toggle, menu, overlay);
        };
        overlay.addEventListener("click", overlayClickHandler);
        cleanupFunctions.push(() => overlay.removeEventListener("click", overlayClickHandler));
      }
      const keydownHandler = (e) => {
        if (e.key === "Escape" && menu.classList.contains("is-open")) {
          this.closeMenu(navbar, toggle, menu, overlay);
        }
      };
      document.addEventListener("keydown", keydownHandler);
      cleanupFunctions.push(() => document.removeEventListener("keydown", keydownHandler));
      let resizeTimer;
      const resizeHandler = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          const breakpoint = this.getBreakpoint();
          if (window.innerWidth >= breakpoint && menu.classList.contains("is-open")) {
            this.closeMenu(navbar, toggle, menu, overlay);
          }
        }, 250);
      };
      window.addEventListener("resize", resizeHandler);
      cleanupFunctions.push(() => {
        clearTimeout(resizeTimer);
        window.removeEventListener("resize", resizeHandler);
      });
      const documentClickHandler = (e) => {
        if (menu.classList.contains("is-open") && !navbar.contains(e.target) && !menu.contains(e.target)) {
          this.closeMenu(navbar, toggle, menu, overlay);
        }
      };
      document.addEventListener("click", documentClickHandler);
      cleanupFunctions.push(() => document.removeEventListener("click", documentClickHandler));
      const dropdownToggles = menu.querySelectorAll(".vd-navbar-dropdown > .vd-nav-link, .vd-navbar-dropdown > .nav-link");
      dropdownToggles.forEach((dropdownToggle) => {
        const dropdownClickHandler = (e) => {
          const breakpoint = this.getBreakpoint();
          if (window.innerWidth < breakpoint) {
            e.preventDefault();
            const dropdown = dropdownToggle.parentElement;
            const dropdownMenu = dropdown.querySelector(".vd-navbar-dropdown-menu");
            if (dropdownMenu) {
              dropdownMenu.classList.toggle("is-open");
            }
          }
        };
        dropdownToggle.addEventListener("click", dropdownClickHandler);
        cleanupFunctions.push(() => dropdownToggle.removeEventListener("click", dropdownClickHandler));
      });
      this.instances.set(navbar, {
        toggle,
        menu,
        overlay,
        cleanup: cleanupFunctions
      });
    },
    /**
     * Destroy a navbar instance and clean up event listeners
     * @param {HTMLElement} navbar - Navbar element
     */
    destroy: function(navbar) {
      const instance = this.instances.get(navbar);
      if (!instance) {
        return;
      }
      instance.cleanup.forEach((fn) => fn());
      if (instance.overlay && instance.overlay.parentNode) {
        instance.overlay.parentNode.removeChild(instance.overlay);
      }
      this.instances.delete(navbar);
    },
    /**
     * Destroy all navbar instances
     */
    destroyAll: function() {
      this.instances.forEach((instance, navbar) => {
        this.destroy(navbar);
      });
    },
    /**
     * Toggle mobile menu
     * @param {HTMLElement} navbar - Navbar element
     * @param {HTMLElement} toggle - Toggle button
     * @param {HTMLElement} menu - Menu element
     * @param {HTMLElement} overlay - Overlay element
     */
    toggleMenu: function(navbar, toggle, menu, overlay) {
      const isOpen = menu.classList.contains("is-open");
      if (isOpen) {
        this.closeMenu(navbar, toggle, menu, overlay);
      } else {
        this.openMenu(navbar, toggle, menu, overlay);
      }
    },
    /**
     * Open mobile menu
     * @param {HTMLElement} navbar - Navbar element
     * @param {HTMLElement} toggle - Toggle button
     * @param {HTMLElement} menu - Menu element
     * @param {HTMLElement} overlay - Overlay element
     */
    openMenu: function(navbar, toggle, menu, overlay) {
      menu.classList.add("is-open");
      toggle.classList.add("is-active");
      if (overlay) {
        overlay.classList.add("is-active");
      }
      document.body.style.overflow = "hidden";
      toggle.setAttribute("aria-expanded", "true");
      menu.setAttribute("aria-hidden", "false");
    },
    /**
     * Close mobile menu
     * @param {HTMLElement} navbar - Navbar element
     * @param {HTMLElement} toggle - Toggle button
     * @param {HTMLElement} menu - Menu element
     * @param {HTMLElement} overlay - Overlay element
     */
    closeMenu: function(navbar, toggle, menu, overlay) {
      menu.classList.remove("is-open");
      toggle.classList.remove("is-active");
      if (overlay) {
        overlay.classList.remove("is-active");
      }
      document.body.style.overflow = "";
      const dropdownMenus = menu.querySelectorAll(".vd-navbar-dropdown-menu.is-open");
      dropdownMenus.forEach((dropdownMenu) => {
        dropdownMenu.classList.remove("is-open");
      });
      toggle.setAttribute("aria-expanded", "false");
      menu.setAttribute("aria-hidden", "true");
    },
    /**
     * Create overlay element if it doesn't exist
     * @param {HTMLElement} navbar - Navbar element
     * @returns {HTMLElement} Overlay element
     */
    createOverlay: function(_navbar) {
      const overlay = document.createElement("div");
      overlay.className = "vd-navbar-overlay";
      document.body.appendChild(overlay);
      return overlay;
    }
  };
  if (typeof window.Vanduo !== "undefined") {
    window.Vanduo.register("navbar", Navbar);
  }
  window.VanduoNavbar = Navbar;
})();

// js/components/pagination.js
(function() {
  "use strict";
  const Pagination = {
    // Store initialized paginations and their cleanup functions
    instances: /* @__PURE__ */ new Map(),
    /**
     * Initialize pagination components
     */
    init: function() {
      const paginations = document.querySelectorAll(".vd-pagination[data-pagination]");
      paginations.forEach((pagination) => {
        if (this.instances.has(pagination)) {
          return;
        }
        this.initPagination(pagination);
      });
    },
    /**
     * Initialize a pagination
     * @param {HTMLElement} pagination - Pagination container
     */
    initPagination: function(pagination) {
      const totalPages = parseInt(pagination.dataset.totalPages) || 1;
      const currentPage = parseInt(pagination.dataset.currentPage) || 1;
      const maxVisible = parseInt(pagination.dataset.maxVisible) || 7;
      this.render(pagination, {
        totalPages,
        currentPage,
        maxVisible
      });
      const clickHandler = (e) => {
        const link = e.target.closest(".vd-pagination-link");
        if (!link || link.closest(".vd-pagination-item.disabled") || link.closest(".vd-pagination-item.active")) {
          return;
        }
        e.preventDefault();
        const item = link.closest(".vd-pagination-item");
        const page = item.dataset.page;
        if (page) {
          this.goToPage(pagination, parseInt(page));
        } else if (item.classList.contains("pagination-prev")) {
          this.prevPage(pagination);
        } else if (item.classList.contains("pagination-next")) {
          this.nextPage(pagination);
        }
      };
      pagination.addEventListener("click", clickHandler);
      this.instances.set(pagination, {
        cleanup: [() => pagination.removeEventListener("click", clickHandler)]
      });
    },
    /**
     * Render pagination
     * @param {HTMLElement} pagination - Pagination container
     * @param {Object} options - Pagination options
     */
    render: function(pagination, options) {
      const { totalPages, currentPage, maxVisible } = options;
      if (totalPages <= 1) {
        pagination.innerHTML = "";
        return;
      }
      let html = "";
      html += `<li class="vd-pagination-item vd-pagination-prev pagination-item pagination-prev ${currentPage === 1 ? "disabled" : ""}">`;
      html += `<a class="vd-pagination-link pagination-link" href="#" aria-label="Previous">Previous</a>`;
      html += `</li>`;
      const pages = this.calculatePages(currentPage, totalPages, maxVisible);
      let lastPage = 0;
      pages.forEach((page) => {
        if (page === "ellipsis") {
          html += `<li class="vd-pagination-item pagination-item"><span class="vd-pagination-ellipsis pagination-ellipsis">\u2026</span></li>`;
        } else {
          if (page !== lastPage + 1 && lastPage > 0) {
            html += `<li class="vd-pagination-item pagination-item"><span class="vd-pagination-ellipsis pagination-ellipsis">\u2026</span></li>`;
          }
          const safePage = Number(page);
          html += `<li class="vd-pagination-item pagination-item ${safePage === currentPage ? "active" : ""}" data-page="${safePage}">`;
          html += `<a class="vd-pagination-link pagination-link" href="#" aria-label="Page ${safePage}">${safePage}</a>`;
          html += `</li>`;
          lastPage = page;
        }
      });
      html += `<li class="vd-pagination-item vd-pagination-next pagination-item pagination-next ${currentPage === totalPages ? "disabled" : ""}">`;
      html += `<a class="vd-pagination-link pagination-link" href="#" aria-label="Next">Next</a>`;
      html += `</li>`;
      pagination.innerHTML = html;
      pagination.dataset.currentPage = currentPage;
    },
    /**
     * Calculate which pages to show
     * @param {number} currentPage - Current page
     * @param {number} totalPages - Total pages
     * @param {number} maxVisible - Maximum visible pages
     * @returns {Array} Array of page numbers or 'ellipsis'
     */
    calculatePages: function(currentPage, totalPages, maxVisible) {
      const pages = [];
      const half = Math.floor(maxVisible / 2);
      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        let start = Math.max(2, currentPage - half);
        let end = Math.min(totalPages - 1, currentPage + half);
        if (currentPage <= half + 1) {
          end = Math.min(totalPages - 1, maxVisible - 1);
        }
        if (currentPage >= totalPages - half) {
          start = Math.max(2, totalPages - maxVisible + 2);
        }
        if (start > 2) {
          pages.push("ellipsis");
        }
        for (let i = start; i <= end; i++) {
          pages.push(i);
        }
        if (end < totalPages - 1) {
          pages.push("ellipsis");
        }
        if (totalPages > 1) {
          pages.push(totalPages);
        }
      }
      return pages;
    },
    /**
     * Go to specific page
     * @param {HTMLElement} pagination - Pagination container
     * @param {number} page - Page number
     */
    goToPage: function(pagination, page) {
      const totalPages = parseInt(pagination.dataset.totalPages) || 1;
      const maxVisible = parseInt(pagination.dataset.maxVisible) || 7;
      if (page < 1 || page > totalPages) {
        return;
      }
      this.render(pagination, {
        totalPages,
        currentPage: page,
        maxVisible
      });
      pagination.dispatchEvent(new CustomEvent("pagination:change", {
        bubbles: true,
        detail: { page, totalPages }
      }));
    },
    /**
     * Go to previous page
     * @param {HTMLElement} pagination - Pagination container
     */
    prevPage: function(pagination) {
      const currentPage = parseInt(pagination.dataset.currentPage) || 1;
      if (currentPage > 1) {
        this.goToPage(pagination, currentPage - 1);
      }
    },
    /**
     * Go to next page
     * @param {HTMLElement} pagination - Pagination container
     */
    nextPage: function(pagination) {
      const currentPage = parseInt(pagination.dataset.currentPage) || 1;
      const totalPages = parseInt(pagination.dataset.totalPages) || 1;
      if (currentPage < totalPages) {
        this.goToPage(pagination, currentPage + 1);
      }
    },
    /**
     * Update pagination
     * @param {HTMLElement|string} pagination - Pagination container or selector
     * @param {Object} options - Pagination options
     */
    update: function(pagination, options) {
      const el = typeof pagination === "string" ? document.querySelector(pagination) : pagination;
      if (el) {
        if (options.totalPages !== void 0) {
          el.dataset.totalPages = options.totalPages;
        }
        if (options.currentPage !== void 0) {
          el.dataset.currentPage = options.currentPage;
        }
        if (options.maxVisible !== void 0) {
          el.dataset.maxVisible = options.maxVisible;
        }
        this.render(el, {
          totalPages: parseInt(el.dataset.totalPages) || 1,
          currentPage: parseInt(el.dataset.currentPage) || 1,
          maxVisible: parseInt(el.dataset.maxVisible) || 7
        });
      }
    },
    /**
     * Destroy a pagination instance and clean up event listeners
     * @param {HTMLElement} pagination - Pagination container
     */
    destroy: function(pagination) {
      const instance = this.instances.get(pagination);
      if (!instance) return;
      instance.cleanup.forEach((fn) => fn());
      this.instances.delete(pagination);
    },
    /**
     * Destroy all pagination instances
     */
    destroyAll: function() {
      this.instances.forEach((instance, pagination) => {
        this.destroy(pagination);
      });
    }
  };
  if (typeof window.Vanduo !== "undefined") {
    window.Vanduo.register("pagination", Pagination);
  }
  window.VanduoPagination = Pagination;
})();

// js/components/parallax.js
(function() {
  "use strict";
  const Parallax = {
    parallaxElements: /* @__PURE__ */ new Map(),
    ticking: false,
    isMobile: window.innerWidth < 768,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    isInitialized: false,
    _onScroll: null,
    _onResize: null,
    /**
     * Initialize parallax components
     */
    init: function() {
      if (this.isInitialized) {
        this.refresh();
        return;
      }
      this.isInitialized = true;
      if (this.reducedMotion) {
        return;
      }
      const parallaxElements = document.querySelectorAll(".vd-parallax");
      parallaxElements.forEach((element) => {
        if (!element.dataset.parallaxInitialized) {
          this.initParallax(element);
        }
      });
      this.handleScroll();
      this._onScroll = () => {
        this.handleScroll();
      };
      window.addEventListener("scroll", this._onScroll, { passive: true });
      this._onResize = () => {
        this.isMobile = window.innerWidth < 768;
        this.updateAll();
      };
      window.addEventListener("resize", this._onResize);
    },
    /**
     * Initialize a parallax element
     * @param {HTMLElement} element - Parallax container
     */
    initParallax: function(element) {
      element.dataset.parallaxInitialized = "true";
      const disableMobile = element.classList.contains("parallax-disable-mobile");
      if (disableMobile && this.isMobile) {
        return;
      }
      const layers = element.querySelectorAll(".vd-parallax-layer, .vd-parallax-bg");
      const speed = this.getSpeed(element);
      const direction = element.classList.contains("parallax-horizontal") ? "horizontal" : "vertical";
      this.parallaxElements.set(element, {
        layers: Array.from(layers),
        speed,
        direction,
        disableMobile
      });
      this.updateParallax(element);
    },
    /**
     * Get parallax speed from element
     * @param {HTMLElement} element - Parallax element
     * @returns {number} Speed multiplier
     */
    getSpeed: function(element) {
      if (element.classList.contains("parallax-slow")) {
        return 0.5;
      } else if (element.classList.contains("parallax-fast")) {
        return 1.5;
      }
      return 1;
    },
    /**
     * Handle scroll event
     */
    handleScroll: function() {
      if (!this.ticking) {
        window.requestAnimationFrame(() => {
          this.updateAll();
          this.ticking = false;
        });
        this.ticking = true;
      }
    },
    /**
     * Update all parallax elements
     */
    updateAll: function() {
      this.parallaxElements.forEach((config, element) => {
        if (config.disableMobile && this.isMobile) {
          return;
        }
        this.updateParallax(element);
      });
    },
    /**
     * Update parallax for a single element
     * @param {HTMLElement} element - Parallax element
     */
    updateParallax: function(element) {
      const config = this.parallaxElements.get(element);
      if (!config) {
        return;
      }
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const elementTop = rect.top;
      const elementHeight = rect.height;
      const scrollProgress = Math.max(0, Math.min(
        1,
        (windowHeight - elementTop) / (windowHeight + elementHeight)
      ));
      const offset = (scrollProgress - 0.5) * config.speed * 100;
      config.layers.forEach((layer, _index) => {
        const layerSpeed = layer.dataset.parallaxSpeed ? parseFloat(layer.dataset.parallaxSpeed) : 1;
        const layerOffset = offset * layerSpeed;
        if (config.direction === "horizontal") {
          layer.style.transform = `translateX(${layerOffset}px)`;
        } else {
          layer.style.transform = `translateY(${layerOffset}px)`;
        }
      });
    },
    /**
     * Destroy parallax element
     * @param {HTMLElement|string} element - Parallax element or selector
     */
    destroy: function(element) {
      const el = typeof element === "string" ? document.querySelector(element) : element;
      if (el && this.parallaxElements.has(el)) {
        const config = this.parallaxElements.get(el);
        config.layers.forEach((layer) => {
          layer.style.transform = "";
        });
        this.parallaxElements.delete(el);
      }
    },
    /**
     * Refresh parallax (recalculate positions)
     */
    refresh: function() {
      this.updateAll();
    },
    destroyAll: function() {
      this.parallaxElements.forEach((_config, element) => {
        this.destroy(element);
      });
      this.parallaxElements.clear();
      if (this._onScroll) {
        window.removeEventListener("scroll", this._onScroll);
        this._onScroll = null;
      }
      if (this._onResize) {
        window.removeEventListener("resize", this._onResize);
        this._onResize = null;
      }
      this.isInitialized = false;
    }
  };
  if (typeof window.Vanduo !== "undefined") {
    window.Vanduo.register("parallax", Parallax);
  }
  window.VanduoParallax = Parallax;
})();

// js/components/preloader.js
(function() {
  "use strict";
  const Preloader = {
    /**
     * Initialize preloader components
     */
    init: function() {
      const progressBars = document.querySelectorAll(".progress-bar[data-progress]");
      progressBars.forEach((bar) => {
        if (!bar.dataset.progressInitialized) {
          this.initProgressBar(bar);
        }
      });
    },
    /**
     * Initialize a progress bar
     * @param {HTMLElement} bar - Progress bar element
     */
    initProgressBar: function(bar) {
      bar.dataset.progressInitialized = "true";
      const initialValue = parseInt(bar.dataset.progress) || 0;
      this.setProgress(bar, initialValue, false);
    },
    /**
     * Set progress value
     * @param {HTMLElement|string} bar - Progress bar element or selector
     * @param {number} value - Progress value (0-100)
     * @param {boolean} animate - Whether to animate
     */
    setProgress: function(bar, value, animate = true) {
      const el = typeof bar === "string" ? document.querySelector(bar) : bar;
      if (!el) {
        return;
      }
      value = Math.max(0, Math.min(100, value));
      if (animate) {
        el.style.transition = "width var(--transition-duration-slow) var(--transition-ease)";
      } else {
        el.style.transition = "none";
        setTimeout(() => {
          el.style.transition = "";
        }, 0);
      }
      el.style.width = value + "%";
      el.setAttribute("aria-valuenow", value);
      el.setAttribute("aria-valuemin", 0);
      el.setAttribute("aria-valuemax", 100);
      const text = el.querySelector(".progress-text");
      if (text) {
        text.textContent = value + "%";
      }
      el.dispatchEvent(new CustomEvent("progress:update", {
        bubbles: true,
        detail: { value, max: 100 }
      }));
      if (value >= 100) {
        el.dispatchEvent(new CustomEvent("progress:complete", {
          bubbles: true,
          detail: { value, max: 100 }
        }));
      }
    },
    /**
     * Animate progress from current to target
     * @param {HTMLElement|string} bar - Progress bar element or selector
     * @param {number} targetValue - Target progress value (0-100)
     * @param {number} duration - Animation duration in ms
     */
    animateProgress: function(bar, targetValue, duration = 1e3) {
      const el = typeof bar === "string" ? document.querySelector(bar) : bar;
      if (!el) {
        return;
      }
      const startValue = parseInt(el.style.width) || 0;
      const difference = targetValue - startValue;
      const startTime = performance.now();
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = startValue + difference * easeOut;
        this.setProgress(el, currentValue, false);
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    },
    /**
     * Show preloader
     * @param {HTMLElement|string} preloader - Preloader element or selector
     */
    show: function(preloader) {
      const el = typeof preloader === "string" ? document.querySelector(preloader) : preloader;
      if (el) {
        el.style.display = "inline-block";
        el.setAttribute("aria-hidden", "false");
      }
    },
    /**
     * Hide preloader
     * @param {HTMLElement|string} preloader - Preloader element or selector
     */
    hide: function(preloader) {
      const el = typeof preloader === "string" ? document.querySelector(preloader) : preloader;
      if (el) {
        el.style.display = "none";
        el.setAttribute("aria-hidden", "true");
      }
    },
    /**
     * Toggle preloader
     * @param {HTMLElement|string} preloader - Preloader element or selector
     */
    toggle: function(preloader) {
      const el = typeof preloader === "string" ? document.querySelector(preloader) : preloader;
      if (el) {
        if (el.style.display === "none" || el.getAttribute("aria-hidden") === "true") {
          this.show(el);
        } else {
          this.hide(el);
        }
      }
    },
    /**
     * Destroy all progress bar instances
     */
    destroyAll: function() {
      const progressBars = document.querySelectorAll('.progress-bar[data-progress-initialized="true"]');
      progressBars.forEach((bar) => {
        delete bar.dataset.progressInitialized;
      });
    }
  };
  if (typeof window.Vanduo !== "undefined") {
    window.Vanduo.register("preloader", Preloader);
  }
  window.VanduoPreloader = Preloader;
})();

// js/components/select.js
(function() {
  "use strict";
  const Select = {
    // Store initialized selects and their cleanup functions
    instances: /* @__PURE__ */ new Map(),
    // Typeahead state
    _typeaheadBuffer: "",
    _typeaheadTimer: null,
    /**
     * Initialize select components
     */
    init: function() {
      const selects = document.querySelectorAll("select.vd-custom-select-input, select[data-custom-select]");
      selects.forEach((select) => {
        if (this.instances.has(select)) {
          return;
        }
        this.initSelect(select);
      });
    },
    /**
     * Initialize a single select
     * @param {HTMLSelectElement} select - Select element
     */
    initSelect: function(select) {
      if (select.closest(".vd-custom-select-wrapper")) {
        return;
      }
      const cleanupFunctions = [];
      const wrapper = document.createElement("div");
      wrapper.className = "custom-select-wrapper";
      select.parentNode.insertBefore(wrapper, select);
      wrapper.appendChild(select);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "custom-select-button";
      button.setAttribute("aria-haspopup", "listbox");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-labelledby", select.id || this.generateId(select));
      const dropdown = document.createElement("div");
      dropdown.className = "custom-select-dropdown";
      dropdown.setAttribute("role", "listbox");
      if (select.dataset.searchable === "true") {
        const searchWrapper = document.createElement("div");
        searchWrapper.className = "custom-select-search";
        const searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.className = "input input-sm";
        searchInput.placeholder = "Search...";
        searchInput.setAttribute("aria-label", "Search options");
        searchWrapper.appendChild(searchInput);
        dropdown.appendChild(searchWrapper);
        const filterFn = (e) => {
          this.filterOptions(dropdown, e.target.value);
        };
        const searchHandler = typeof debounce === "function" ? debounce(filterFn, 150) : filterFn;
        searchInput.addEventListener("input", searchHandler);
        cleanupFunctions.push(() => searchInput.removeEventListener("input", searchHandler));
      }
      this.buildOptions(select, dropdown, button);
      wrapper.appendChild(button);
      wrapper.appendChild(dropdown);
      this.updateButtonText(select, button);
      const buttonClickHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleDropdown(button, dropdown);
      };
      button.addEventListener("click", buttonClickHandler);
      cleanupFunctions.push(() => button.removeEventListener("click", buttonClickHandler));
      const documentClickHandler = (e) => {
        if (!wrapper.contains(e.target) && dropdown.classList.contains("is-open")) {
          this.closeDropdown(button, dropdown);
        }
      };
      document.addEventListener("click", documentClickHandler);
      cleanupFunctions.push(() => document.removeEventListener("click", documentClickHandler));
      const keydownHandler = (e) => {
        this.handleKeydown(e, select, button, dropdown);
      };
      button.addEventListener("keydown", keydownHandler);
      cleanupFunctions.push(() => button.removeEventListener("keydown", keydownHandler));
      const changeHandler = () => {
        this.updateButtonText(select, button);
        this.updateSelectedOptions(select, dropdown);
      };
      select.addEventListener("change", changeHandler);
      cleanupFunctions.push(() => select.removeEventListener("change", changeHandler));
      this.instances.set(select, { wrapper, button, dropdown, cleanup: cleanupFunctions });
    },
    /**
     * Build options in dropdown
     * @param {HTMLSelectElement} select - Select element
     * @param {HTMLElement} dropdown - Dropdown container
     * @param {HTMLElement} button - Button element
     */
    buildOptions: function(select, dropdown, button) {
      const options = select.querySelectorAll("option");
      const fragment = document.createDocumentFragment();
      options.forEach((option, index) => {
        if (option.parentElement.tagName === "OPTGROUP") {
          const group = option.parentElement;
          if (!dropdown.querySelector(`[data-group="${group.label}"]`)) {
            const groupElement = document.createElement("div");
            groupElement.className = "custom-select-option-group";
            groupElement.textContent = group.label;
            groupElement.dataset.group = group.label;
            fragment.appendChild(groupElement);
          }
        }
        if (option.value === "" && !option.textContent.trim()) {
          return;
        }
        const optionElement = document.createElement("div");
        optionElement.className = "custom-select-option";
        optionElement.textContent = option.textContent;
        optionElement.setAttribute("role", "option");
        optionElement.setAttribute("data-value", option.value);
        optionElement.setAttribute("data-index", index);
        if (option.selected) {
          optionElement.classList.add("is-selected");
          optionElement.setAttribute("aria-selected", "true");
        }
        if (option.disabled) {
          optionElement.classList.add("is-disabled");
          optionElement.setAttribute("aria-disabled", "true");
        }
        optionElement.addEventListener("click", (_e) => {
          if (!option.disabled) {
            this.selectOption(select, option, optionElement, button, dropdown);
          }
        });
        fragment.appendChild(optionElement);
      });
      dropdown.appendChild(fragment);
    },
    /**
     * Select an option
     * @param {HTMLSelectElement} select - Select element
     * @param {HTMLOptionElement} option - Option element
     * @param {HTMLElement} optionElement - Custom option element
     * @param {HTMLElement} button - Button element
     * @param {HTMLElement} dropdown - Dropdown container
     */
    selectOption: function(select, option, optionElement, button, dropdown) {
      if (select.multiple) {
        option.selected = !option.selected;
        optionElement.classList.toggle("is-selected");
        optionElement.setAttribute("aria-selected", option.selected);
      } else {
        select.value = option.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        this.closeDropdown(button, dropdown);
      }
      this.updateButtonText(select, button);
    },
    /**
     * Update button text
     * @param {HTMLSelectElement} select - Select element
     * @param {HTMLElement} button - Button element
     */
    updateButtonText: function(select, button) {
      if (select.multiple) {
        const selected = Array.from(select.selectedOptions);
        if (selected.length === 0) {
          button.textContent = select.dataset.placeholder || "Select options...";
        } else if (selected.length === 1) {
          button.textContent = selected[0].textContent;
        } else {
          button.textContent = `${selected.length} selected`;
        }
      } else {
        const selectedOption = select.options[select.selectedIndex];
        button.textContent = selectedOption ? selectedOption.textContent : select.dataset.placeholder || "Select...";
      }
    },
    /**
     * Update selected options in dropdown
     * @param {HTMLSelectElement} select - Select element
     * @param {HTMLElement} dropdown - Dropdown container
     */
    updateSelectedOptions: function(select, dropdown) {
      const options = dropdown.querySelectorAll(".vd-custom-select-option");
      const selectedValues = Array.from(select.selectedOptions).map((opt) => opt.value);
      options.forEach((optionEl) => {
        const value = optionEl.dataset.value;
        if (selectedValues.includes(value)) {
          optionEl.classList.add("is-selected");
          optionEl.setAttribute("aria-selected", "true");
        } else {
          optionEl.classList.remove("is-selected");
          optionEl.setAttribute("aria-selected", "false");
        }
      });
    },
    /**
     * Toggle dropdown
     * @param {HTMLElement} button - Button element
     * @param {HTMLElement} dropdown - Dropdown container
     */
    toggleDropdown: function(button, dropdown) {
      const isOpen = dropdown.classList.contains("is-open");
      if (isOpen) {
        this.closeDropdown(button, dropdown);
      } else {
        this.openDropdown(button, dropdown);
      }
    },
    /**
     * Open dropdown
     * @param {HTMLElement} button - Button element
     * @param {HTMLElement} dropdown - Dropdown container
     */
    openDropdown: function(button, dropdown) {
      dropdown.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
      const firstOption = dropdown.querySelector(".vd-custom-select-option:not(.is-disabled)");
      if (firstOption) {
        firstOption.focus();
      }
    },
    /**
     * Close dropdown
     * @param {HTMLElement} button - Button element
     * @param {HTMLElement} dropdown - Dropdown container
     */
    closeDropdown: function(button, dropdown) {
      dropdown.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
    },
    /**
     * Handle keyboard navigation
     * @param {KeyboardEvent} e - Keyboard event
     * @param {HTMLSelectElement} select - Select element
     * @param {HTMLElement} button - Button element
     * @param {HTMLElement} dropdown - Dropdown container
     */
    handleKeydown: function(e, select, button, dropdown) {
      const isOpen = dropdown.classList.contains("is-open");
      const options = Array.from(dropdown.querySelectorAll(".vd-custom-select-option:not(.is-disabled)"));
      const currentIndex = options.findIndex((opt) => opt === document.activeElement);
      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          if (isOpen && currentIndex >= 0) {
            const optionEl = options[currentIndex];
            const option = select.options[parseInt(optionEl.dataset.index)];
            this.selectOption(select, option, optionEl, button, dropdown);
          } else {
            this.openDropdown(button, dropdown);
          }
          break;
        case "Escape":
          if (isOpen) {
            e.preventDefault();
            this.closeDropdown(button, dropdown);
            button.focus();
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (!isOpen) {
            this.openDropdown(button, dropdown);
          } else {
            const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
            options[nextIndex].focus();
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (isOpen) {
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
            options[prevIndex].focus();
          }
          break;
        case "Home":
          if (isOpen) {
            e.preventDefault();
            options[0].focus();
          }
          break;
        case "End":
          if (isOpen) {
            e.preventDefault();
            options[options.length - 1].focus();
          }
          break;
        default:
          if (isOpen && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            clearTimeout(this._typeaheadTimer);
            this._typeaheadBuffer += e.key.toLowerCase();
            const match = options.find(
              (opt) => opt.textContent.trim().toLowerCase().startsWith(this._typeaheadBuffer)
            );
            if (match) {
              match.focus();
            }
            this._typeaheadTimer = setTimeout(() => {
              this._typeaheadBuffer = "";
            }, 500);
          }
          break;
      }
    },
    /**
     * Filter options by search term
     * @param {HTMLElement} dropdown - Dropdown container
     * @param {string} searchTerm - Search term
     */
    filterOptions: function(dropdown, searchTerm) {
      const options = dropdown.querySelectorAll(".vd-custom-select-option");
      const term = searchTerm.toLowerCase();
      options.forEach((option) => {
        const text = option.textContent.toLowerCase();
        if (text.includes(term)) {
          option.style.display = "block";
        } else {
          option.style.display = "none";
        }
      });
    },
    /**
     * Generate unique ID
     * @param {HTMLElement} element - Element
     * @returns {string} Generated ID
     */
    generateId: function(element) {
      if (element.id) {
        return element.id;
      }
      return "select-" + Math.random().toString(36).substr(2, 9);
    },
    /**
     * Destroy a select instance and clean up event listeners
     * @param {HTMLSelectElement} select - Select element
     */
    destroy: function(select) {
      const instance = this.instances.get(select);
      if (!instance) return;
      instance.cleanup.forEach((fn) => fn());
      if (instance.wrapper && instance.wrapper.parentNode) {
        instance.wrapper.parentNode.insertBefore(select, instance.wrapper);
        instance.wrapper.parentNode.removeChild(instance.wrapper);
      }
      this.instances.delete(select);
    },
    /**
     * Destroy all select instances
     */
    destroyAll: function() {
      this.instances.forEach((instance, select) => {
        this.destroy(select);
      });
    }
  };
  if (typeof window.Vanduo !== "undefined") {
    window.Vanduo.register("select", Select);
  }
})();

// js/components/sidenav.js
(function() {
  "use strict";
  const Sidenav = {
    sidenavs: /* @__PURE__ */ new Map(),
    breakpoint: 992,
    // Desktop breakpoint
    // Global cleanup functions (toggles, resize)
    _globalCleanups: [],
    isFixedVariant: function(sidenav) {
      return sidenav.classList.contains("vd-sidenav-fixed") || sidenav.classList.contains("sidenav-fixed");
    },
    isPushVariant: function(sidenav) {
      return sidenav.classList.contains("vd-sidenav-push") || sidenav.classList.contains("sidenav-push");
    },
    isRightVariant: function(sidenav) {
      return sidenav.classList.contains("vd-sidenav-right") || sidenav.classList.contains("sidenav-right");
    },
    /**
     * Initialize sidenav components
     */
    init: function() {
      const sidenavs = document.querySelectorAll(".vd-sidenav");
      sidenavs.forEach((sidenav) => {
        if (this.sidenavs.has(sidenav)) {
          return;
        }
        this.initSidenav(sidenav);
      });
      const toggles = document.querySelectorAll("[data-sidenav-toggle]");
      toggles.forEach((toggle) => {
        if (toggle.dataset.sidenavToggleInitialized) return;
        toggle.dataset.sidenavToggleInitialized = "true";
        const toggleClickHandler = (e) => {
          e.preventDefault();
          const targetId = toggle.dataset.sidenavToggle;
          const sidenav = document.querySelector(targetId);
          if (sidenav) {
            this.toggle(sidenav);
          }
        };
        toggle.addEventListener("click", toggleClickHandler);
        this._globalCleanups.push(() => toggle.removeEventListener("click", toggleClickHandler));
      });
      this.handleResize();
      const resizeHandler = () => {
        this.handleResize();
      };
      window.addEventListener("resize", resizeHandler);
      this._globalCleanups.push(() => window.removeEventListener("resize", resizeHandler));
    },
    /**
     * Initialize a single sidenav
     * @param {HTMLElement} sidenav - Sidenav element
     */
    initSidenav: function(sidenav) {
      const overlay = this.createOverlay(sidenav);
      const closeButton = sidenav.querySelector(".vd-sidenav-close");
      const cleanupFunctions = [];
      sidenav.setAttribute("role", "navigation");
      sidenav.setAttribute("aria-hidden", "true");
      if (closeButton) {
        const closeHandler = () => {
          this.close(sidenav);
        };
        closeButton.addEventListener("click", closeHandler);
        cleanupFunctions.push(() => closeButton.removeEventListener("click", closeHandler));
      }
      const overlayClickHandler = () => {
        if (sidenav.dataset.backdrop !== "static") {
          this.close(sidenav);
        }
      };
      overlay.addEventListener("click", overlayClickHandler);
      cleanupFunctions.push(() => overlay.removeEventListener("click", overlayClickHandler));
      const escKeyHandler = (e) => {
        if (e.key === "Escape" && sidenav.classList.contains("is-open")) {
          if (sidenav.dataset.keyboard !== "false") {
            this.close(sidenav);
          }
        }
      };
      document.addEventListener("keydown", escKeyHandler);
      cleanupFunctions.push(() => document.removeEventListener("keydown", escKeyHandler));
      this.sidenavs.set(sidenav, { overlay, cleanup: cleanupFunctions });
    },
    /**
     * Create overlay element
     * @param {HTMLElement} sidenav - Sidenav element
     * @returns {HTMLElement} Overlay element
     */
    createOverlay: function(sidenav) {
      let overlay = sidenav.querySelector(".vd-sidenav-overlay");
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "vd-sidenav-overlay";
        document.body.appendChild(overlay);
      }
      return overlay;
    },
    /**
     * Open sidenav
     * @param {HTMLElement|string} sidenav - Sidenav element or selector
     */
    open: function(sidenav) {
      const el = typeof sidenav === "string" ? document.querySelector(sidenav) : sidenav;
      if (!el || !this.sidenavs.has(el)) {
        return;
      }
      const { overlay } = this.sidenavs.get(el);
      if (!this.isFixedVariant(el)) {
        overlay.classList.add("is-visible");
      }
      el.classList.add("is-open");
      el.setAttribute("aria-hidden", "false");
      document.body.classList.add("body-sidenav-open");
      if (this.isPushVariant(el)) {
        this.handlePushVariant(el, true);
      }
      el.dispatchEvent(new CustomEvent("sidenav:open", { bubbles: true }));
    },
    /**
     * Close sidenav
     * @param {HTMLElement|string} sidenav - Sidenav element or selector
     */
    close: function(sidenav) {
      const el = typeof sidenav === "string" ? document.querySelector(sidenav) : sidenav;
      if (!el || !this.sidenavs.has(el)) {
        return;
      }
      const { overlay } = this.sidenavs.get(el);
      overlay.classList.remove("is-visible");
      el.classList.remove("is-open");
      el.setAttribute("aria-hidden", "true");
      document.body.classList.remove("body-sidenav-open");
      if (this.isPushVariant(el)) {
        this.handlePushVariant(el, false);
      }
      el.dispatchEvent(new CustomEvent("sidenav:close", { bubbles: true }));
    },
    /**
     * Toggle sidenav
     * @param {HTMLElement|string} sidenav - Sidenav element or selector
     */
    toggle: function(sidenav) {
      const el = typeof sidenav === "string" ? document.querySelector(sidenav) : sidenav;
      if (el) {
        if (el.classList.contains("is-open")) {
          this.close(el);
        } else {
          this.open(el);
        }
      }
    },
    /**
     * Handle push variant
     * @param {HTMLElement} sidenav - Sidenav element
     * @param {boolean} isOpen - Whether sidenav is open
     */
    handlePushVariant: function(sidenav, isOpen) {
      const content = document.querySelector('main, .main-content, .content, [role="main"]') || document.body;
      if (isOpen) {
        if (window.innerWidth >= this.breakpoint) {
          if (this.isRightVariant(sidenav)) {
            content.style.marginRight = sidenav.offsetWidth + "px";
          } else {
            content.style.marginLeft = sidenav.offsetWidth + "px";
          }
        }
      } else {
        content.style.marginLeft = "";
        content.style.marginRight = "";
      }
    },
    /**
     * Handle window resize
     */
    handleResize: function() {
      this.sidenavs.forEach(({ overlay }, sidenav) => {
        if (window.innerWidth >= this.breakpoint) {
          if (this.isFixedVariant(sidenav) && !sidenav.classList.contains("is-open")) {
            sidenav.classList.add("is-open");
            sidenav.setAttribute("aria-hidden", "false");
            overlay.classList.remove("is-visible");
          }
        } else {
          if (this.isFixedVariant(sidenav) && sidenav.classList.contains("is-open")) {
            this.close(sidenav);
          }
        }
      });
    },
    /**
     * Destroy a sidenav instance and clean up event listeners
     * @param {HTMLElement} sidenav - Sidenav element
     */
    destroy: function(sidenav) {
      const data = this.sidenavs.get(sidenav);
      if (!data) return;
      if (sidenav.classList.contains("is-open")) {
        this.close(sidenav);
      }
      data.cleanup.forEach((fn) => fn());
      if (data.overlay && data.overlay.parentNode) {
        data.overlay.parentNode.removeChild(data.overlay);
      }
      this.sidenavs.delete(sidenav);
    },
    /**
     * Destroy all sidenav instances
     */
    destroyAll: function() {
      this.sidenavs.forEach((data, sidenav) => {
        this.destroy(sidenav);
      });
      this._globalCleanups.forEach((fn) => fn());
      this._globalCleanups = [];
    }
  };
  if (typeof window.Vanduo !== "undefined") {
    window.Vanduo.register("sidenav", Sidenav);
  }
  window.VanduoSidenav = Sidenav;
})();

// js/components/tabs.js
(function() {
  "use strict";
  const Tabs = {
    // Store initialized tab containers and their cleanup functions
    instances: /* @__PURE__ */ new Map(),
    /**
     * Initialize all tab components
     */
    init: function() {
      const tabContainers = document.querySelectorAll(".vd-tabs, [data-tabs]");
      tabContainers.forEach((container) => {
        if (this.instances.has(container)) {
          return;
        }
        this.initTabs(container);
      });
    },
    /**
     * Initialize a single tab container
     * @param {HTMLElement} container - Tabs container element
     */
    initTabs: function(container) {
      const tabList = container.querySelector('.vd-tab-list, [role="tablist"]');
      const tabLinks = container.querySelectorAll(".vd-tab-link, [data-tab]");
      const tabPanes = container.querySelectorAll(".vd-tab-pane, [data-tab-pane]");
      if (!tabList || tabLinks.length === 0) return;
      const cleanupFunctions = [];
      tabList.setAttribute("role", "tablist");
      tabLinks.forEach((link, index) => {
        const tabId = link.dataset.tab || link.getAttribute("href")?.replace("#", "") || `tab-${index}`;
        const pane = this.findPane(container, tabId, tabPanes);
        link.setAttribute("role", "tab");
        link.setAttribute("aria-selected", link.classList.contains("is-active") ? "true" : "false");
        link.setAttribute("tabindex", link.classList.contains("is-active") ? "0" : "-1");
        if (!link.id) {
          link.id = `tab-btn-${tabId}`;
        }
        if (pane) {
          pane.setAttribute("role", "tabpanel");
          pane.setAttribute("aria-labelledby", link.id);
          if (!pane.id) {
            pane.id = `tab-pane-${tabId}`;
          }
          link.setAttribute("aria-controls", pane.id);
        }
        const clickHandler = (e) => {
          e.preventDefault();
          if (!link.classList.contains("disabled") && !link.disabled) {
            this.activateTab(container, link, tabLinks, tabPanes);
          }
        };
        link.addEventListener("click", clickHandler);
        cleanupFunctions.push(() => link.removeEventListener("click", clickHandler));
        const keydownHandler = (e) => {
          this.handleKeydown(e, container, link, tabLinks, tabPanes);
        };
        link.addEventListener("keydown", keydownHandler);
        cleanupFunctions.push(() => link.removeEventListener("keydown", keydownHandler));
      });
      const activeTab = container.querySelector(".vd-tab-link.is-active, [data-tab].is-active");
      if (!activeTab && tabLinks.length > 0) {
        this.activateTab(container, tabLinks[0], tabLinks, tabPanes);
      }
      this.instances.set(container, { cleanup: cleanupFunctions });
    },
    /**
     * Find the pane associated with a tab
     * @param {HTMLElement} container - Tabs container
     * @param {string} tabId - Tab identifier
     * @param {NodeList} tabPanes - All tab panes
     * @returns {HTMLElement|null} The matching pane
     */
    findPane: function(container, tabId, tabPanes) {
      let pane = container.querySelector(`[data-tab-pane="${tabId}"]`);
      if (!pane) {
        pane = container.querySelector(`#${tabId}`);
      }
      if (!pane) {
        const tabLinks = container.querySelectorAll(".vd-tab-link, [data-tab]");
        tabLinks.forEach((link, index) => {
          const linkTabId = link.dataset.tab || link.getAttribute("href")?.replace("#", "");
          if (linkTabId === tabId && tabPanes[index]) {
            pane = tabPanes[index];
          }
        });
      }
      return pane;
    },
    /**
     * Activate a tab
     * @param {HTMLElement} container - Tabs container
     * @param {HTMLElement} tab - Tab to activate
     * @param {NodeList} allTabs - All tab links
     * @param {NodeList} allPanes - All tab panes
     */
    activateTab: function(container, tab, allTabs, allPanes) {
      const tabId = tab.dataset.tab || tab.getAttribute("href")?.replace("#", "") || tab.id;
      allTabs.forEach((t) => {
        t.classList.remove("is-active");
        t.setAttribute("aria-selected", "false");
        t.setAttribute("tabindex", "-1");
        if (t.parentElement && t.parentElement.classList.contains("tab-item")) {
          t.parentElement.classList.remove("is-active");
        }
      });
      allPanes.forEach((p) => {
        p.classList.remove("is-active");
      });
      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");
      tab.setAttribute("tabindex", "0");
      if (tab.parentElement && tab.parentElement.classList.contains("tab-item")) {
        tab.parentElement.classList.add("is-active");
      }
      const pane = this.findPane(container, tabId, allPanes);
      if (pane) {
        pane.classList.add("is-active");
      }
      const event = new CustomEvent("tab:change", {
        bubbles: true,
        detail: {
          tab,
          pane,
          tabId
        }
      });
      container.dispatchEvent(event);
    },
    /**
     * Handle keyboard navigation
     * @param {KeyboardEvent} e - Keyboard event
     * @param {HTMLElement} container - Tabs container
     * @param {HTMLElement} currentTab - Currently focused tab
     * @param {NodeList} allTabs - All tab links
     * @param {NodeList} allPanes - All tab panes
     */
    handleKeydown: function(e, container, currentTab, allTabs, allPanes) {
      const isVertical = container.classList.contains("tabs-vertical");
      const tabs = Array.from(allTabs).filter((t) => !t.classList.contains("disabled") && !t.disabled);
      const currentIndex = tabs.indexOf(currentTab);
      let newIndex = currentIndex;
      switch (e.key) {
        case "ArrowLeft":
          if (!isVertical) {
            e.preventDefault();
            newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
          }
          break;
        case "ArrowRight":
          if (!isVertical) {
            e.preventDefault();
            newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
          }
          break;
        case "ArrowUp":
          if (isVertical) {
            e.preventDefault();
            newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
          }
          break;
        case "ArrowDown":
          if (isVertical) {
            e.preventDefault();
            newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
          }
          break;
        case "Home":
          e.preventDefault();
          newIndex = 0;
          break;
        case "End":
          e.preventDefault();
          newIndex = tabs.length - 1;
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          this.activateTab(container, currentTab, allTabs, allPanes);
          return;
        default:
          return;
      }
      if (newIndex !== currentIndex) {
        tabs[newIndex].focus();
        this.activateTab(container, tabs[newIndex], allTabs, allPanes);
      }
    },
    /**
     * Programmatically show a tab
     * @param {string|HTMLElement} tab - Tab identifier or element
     */
    show: function(tab) {
      let tabElement;
      if (typeof tab === "string") {
        tabElement = document.querySelector(`[data-tab="${tab}"], [href="#${tab}"]`);
      } else {
        tabElement = tab;
      }
      if (!tabElement) return;
      const container = tabElement.closest(".vd-tabs, [data-tabs]");
      if (!container) return;
      const allTabs = container.querySelectorAll(".vd-tab-link, [data-tab]");
      const allPanes = container.querySelectorAll(".vd-tab-pane, [data-tab-pane]");
      this.activateTab(container, tabElement, allTabs, allPanes);
    },
    /**
     * Destroy a tabs instance and clean up event listeners
     * @param {HTMLElement} container - Tabs container
     */
    destroy: function(container) {
      const instance = this.instances.get(container);
      if (!instance) return;
      instance.cleanup.forEach((fn) => fn());
      this.instances.delete(container);
    },
    /**
     * Destroy all tabs instances
     */
    destroyAll: function() {
      this.instances.forEach((instance, container) => {
        this.destroy(container);
      });
    }
  };
  if (typeof window.Vanduo !== "undefined") {
    window.Vanduo.register("tabs", Tabs);
  }
})();

// js/components/theme-customizer.js
(function() {
  "use strict";
  const ThemeCustomizer = {
    // Storage keys
    STORAGE_KEYS: {
      PRIMARY: "vanduo-primary-color",
      NEUTRAL: "vanduo-neutral-color",
      RADIUS: "vanduo-radius",
      FONT: "vanduo-font-preference",
      THEME: "vanduo-theme-preference"
    },
    // Default values
    DEFAULTS: {
      PRIMARY_LIGHT: "black",
      PRIMARY_DARK: "amber",
      NEUTRAL: "neutral",
      RADIUS: "0.5",
      FONT: "ubuntu",
      THEME: "system"
    },
    // Primary color definitions (Open Color based)
    PRIMARY_COLORS: {
      "black": { name: "Black", color: "#000000" },
      "red": { name: "Red", color: "#fa5252" },
      "orange": { name: "Orange", color: "#fd7e14" },
      "amber": { name: "Amber", color: "#f59f00" },
      "yellow": { name: "Yellow", color: "#fcc419" },
      "lime": { name: "Lime", color: "#82c91e" },
      "green": { name: "Green", color: "#40c057" },
      "emerald": { name: "Emerald", color: "#20c997" },
      "teal": { name: "Teal", color: "#12b886" },
      "cyan": { name: "Cyan", color: "#22b8cf" },
      "sky": { name: "Sky", color: "#3bc9db" },
      "blue": { name: "Blue", color: "#228be6" },
      "indigo": { name: "Indigo", color: "#4c6ef5" },
      "violet": { name: "Violet", color: "#7950f2" },
      "purple": { name: "Purple", color: "#be4bdb" },
      "fuchsia": { name: "Fuchsia", color: "#f06595" },
      "pink": { name: "Pink", color: "#e64980" },
      "rose": { name: "Rose", color: "#ff8787" }
    },
    // Neutral color definitions
    NEUTRAL_COLORS: {
      "slate": { name: "Slate", color: "#64748b" },
      "gray": { name: "Gray", color: "#6b7280" },
      "zinc": { name: "Zinc", color: "#71717a" },
      "neutral": { name: "Neutral", color: "#737373" },
      "stone": { name: "Stone", color: "#78716c" }
    },
    // Radius options
    RADIUS_OPTIONS: ["0", "0.125", "0.25", "0.375", "0.5"],
    // Font options
    FONT_OPTIONS: {
      "jetbrains-mono": { name: "JetBrains Mono", family: "'JetBrains Mono', monospace" },
      "inter": { name: "Inter", family: "'Inter', sans-serif" },
      "source-sans": { name: "Source Sans 3", family: "'Source Sans 3', sans-serif" },
      "fira-sans": { name: "Fira Sans", family: "'Fira Sans', sans-serif" },
      "ibm-plex": { name: "IBM Plex Sans", family: "'IBM Plex Sans', sans-serif" },
      "system": { name: "System Default", family: null },
      // Google Fonts Collection
      "ubuntu": { name: "Ubuntu", family: "'Ubuntu', sans-serif" },
      "open-sans": { name: "Open Sans", family: "'Open Sans', sans-serif" },
      "rubik": { name: "Rubik", family: "'Rubik', sans-serif" },
      "titillium-web": { name: "Titillium Web", family: "'Titillium Web', sans-serif" }
    },
    // Theme mode options
    THEME_MODES: ["system", "dark", "light"],
    // State
    state: {
      primary: null,
      neutral: null,
      radius: null,
      font: null,
      theme: null,
      isOpen: false
    },
    isInitialized: false,
    _cleanup: [],
    // DOM references
    elements: {
      customizer: null,
      trigger: null,
      panel: null,
      overlay: null
    },
    /**
     * Initialize the Theme Customizer
     */
    init: function() {
      if (this.isInitialized) {
        this.bindExistingElements();
        this.bindPanelEvents();
        this.updateUI();
        return;
      }
      this.isInitialized = true;
      this._cleanup = [];
      this.loadPreferences();
      this.applyAllPreferences();
      this.bindExistingElements();
      this.bindEvents();
      console.log("Vanduo Theme Customizer initialized");
    },
    addListener: function(target, event, handler, options) {
      if (!target) return;
      target.addEventListener(event, handler, options);
      this._cleanup.push(() => target.removeEventListener(event, handler, options));
    },
    /**
     * Get default primary color based on theme
     */
    getDefaultPrimary: function(theme) {
      if (theme === "system") {
        if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
          return this.DEFAULTS.PRIMARY_DARK;
        }
        return this.DEFAULTS.PRIMARY_LIGHT;
      }
      return theme === "dark" ? this.DEFAULTS.PRIMARY_DARK : this.DEFAULTS.PRIMARY_LIGHT;
    },
    /**
     * Load preferences from localStorage
     */
    loadPreferences: function() {
      this.state.theme = this.getStorageValue(this.STORAGE_KEYS.THEME, this.DEFAULTS.THEME);
      this.state.primary = this.getStorageValue(this.STORAGE_KEYS.PRIMARY, this.getDefaultPrimary(this.state.theme));
      this.state.neutral = this.getStorageValue(this.STORAGE_KEYS.NEUTRAL, this.DEFAULTS.NEUTRAL);
      this.state.radius = this.getStorageValue(this.STORAGE_KEYS.RADIUS, this.DEFAULTS.RADIUS);
      this.state.font = this.getStorageValue(this.STORAGE_KEYS.FONT, this.DEFAULTS.FONT);
    },
    /**
     * Save a preference to localStorage
     */
    savePreference: function(key, value) {
      this.setStorageValue(key, value);
    },
    /**
     * Apply all preferences
     */
    applyAllPreferences: function() {
      this.applyPrimary(this.state.primary);
      this.applyNeutral(this.state.neutral);
      this.applyRadius(this.state.radius);
      this.applyFont(this.state.font);
      this.applyTheme(this.state.theme);
    },
    /**
     * Apply primary color
     */
    applyPrimary: function(colorKey) {
      if (!this.PRIMARY_COLORS[colorKey]) {
        colorKey = this.getDefaultPrimary(this.state.theme);
      }
      this.state.primary = colorKey;
      document.documentElement.setAttribute("data-primary", colorKey);
      this.savePreference(this.STORAGE_KEYS.PRIMARY, colorKey);
      this.dispatchEvent("primary-change", { color: colorKey });
    },
    /**
     * Apply neutral color
     */
    applyNeutral: function(neutralKey) {
      if (!this.NEUTRAL_COLORS[neutralKey]) {
        neutralKey = this.DEFAULTS.NEUTRAL;
      }
      this.state.neutral = neutralKey;
      document.documentElement.setAttribute("data-neutral", neutralKey);
      this.savePreference(this.STORAGE_KEYS.NEUTRAL, neutralKey);
      this.dispatchEvent("neutral-change", { neutral: neutralKey });
    },
    /**
     * Apply border radius
     */
    applyRadius: function(radius) {
      if (!this.RADIUS_OPTIONS.includes(radius)) {
        radius = this.DEFAULTS.RADIUS;
      }
      this.state.radius = radius;
      document.documentElement.setAttribute("data-radius", radius);
      document.documentElement.style.setProperty("--radius-scale", radius);
      this.savePreference(this.STORAGE_KEYS.RADIUS, radius);
      this.dispatchEvent("radius-change", { radius });
    },
    /**
     * Apply font family
     */
    applyFont: function(fontKey) {
      if (!this.FONT_OPTIONS[fontKey]) {
        fontKey = this.DEFAULTS.FONT;
      }
      this.state.font = fontKey;
      if (fontKey === "system") {
        document.documentElement.removeAttribute("data-font");
      } else {
        document.documentElement.setAttribute("data-font", fontKey);
      }
      this.savePreference(this.STORAGE_KEYS.FONT, fontKey);
      if (window.FontSwitcher && window.FontSwitcher.setPreference) {
        window.FontSwitcher.state.preference = fontKey;
        window.FontSwitcher.applyFont();
      }
      this.dispatchEvent("font-change", { font: fontKey });
    },
    /**
     * Apply theme mode
     */
    applyTheme: function(mode) {
      if (!this.THEME_MODES.includes(mode)) {
        mode = this.DEFAULTS.THEME;
      }
      const oldDefault = this.getDefaultPrimary(this.state.theme);
      if (this.state.primary === oldDefault) {
        const newDefault = this.getDefaultPrimary(mode);
        if (newDefault !== this.state.primary) {
          this.applyPrimary(newDefault);
        }
      }
      this.state.theme = mode;
      if (mode === "system") {
        document.documentElement.removeAttribute("data-theme");
      } else {
        document.documentElement.setAttribute("data-theme", mode);
      }
      this.savePreference(this.STORAGE_KEYS.THEME, mode);
      if (window.Vanduo && window.Vanduo.components.themeSwitcher) {
        const themeSwitcher = window.Vanduo.components.themeSwitcher;
        if (themeSwitcher.state) {
          themeSwitcher.state.preference = mode;
        }
      }
      this.dispatchEvent("mode-change", { mode });
    },
    /**
     * Dispatch custom event
     */
    dispatchEvent: function(type, detail) {
      const event = new CustomEvent("theme:" + type, {
        bubbles: true,
        detail
      });
      document.dispatchEvent(event);
      const changeEvent = new CustomEvent("theme:change", {
        bubbles: true,
        detail: {
          type,
          value: detail[Object.keys(detail)[0]],
          state: { ...this.state }
        }
      });
      document.dispatchEvent(changeEvent);
    },
    /**
     * Bind to existing DOM elements or create them dynamically
     */
    bindExistingElements: function() {
      this.elements.customizer = document.querySelector(".vd-theme-customizer");
      if (this.elements.customizer) {
        this.elements.trigger = this.elements.customizer.querySelector(".vd-theme-customizer-trigger");
        this.elements.panel = this.elements.customizer.querySelector(".vd-theme-customizer-panel");
        this.elements.overlay = this.elements.customizer.querySelector(".vd-theme-customizer-overlay");
      } else {
        const standaloneTrigger = document.querySelector("[data-theme-customizer-trigger]");
        if (standaloneTrigger) {
          this.createDynamicPanel(standaloneTrigger);
        }
      }
      this.updateUI();
    },
    /**
     * Create the panel dynamically when only a trigger button exists
     */
    createDynamicPanel: function(triggerButton) {
      const wrapper = document.createElement("div");
      wrapper.className = "vd-theme-customizer";
      this.elements.trigger = triggerButton;
      const overlay = document.createElement("div");
      overlay.className = "vd-theme-customizer-overlay";
      const panel = document.createElement("div");
      panel.className = "vd-theme-customizer-panel";
      panel.innerHTML = this.getPanelHTML();
      document.body.appendChild(overlay);
      document.body.appendChild(panel);
      this.elements.panel = panel;
      this.elements.overlay = overlay;
      this.elements.customizer = { contains: (el) => panel.contains(el) || triggerButton.contains(el) };
      this.positionPanel();
      this.bindPanelEvents();
      this.addListener(window, "resize", () => this.positionPanel());
    },
    /**
     * Position the panel below the trigger button on desktop
     */
    positionPanel: function() {
      if (!this.elements.panel || !this.elements.trigger) return;
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        this.elements.panel.style.top = "";
        this.elements.panel.style.right = "";
        this.elements.panel.style.left = "";
        this.elements.panel.style.height = "";
        this.elements.panel.style.maxHeight = "";
      } else {
        const triggerRect = this.elements.trigger.getBoundingClientRect();
        const panelWidth = 320;
        const panelTop = triggerRect.bottom + 8;
        const viewportWidth = window.innerWidth;
        let panelRight = viewportWidth - triggerRect.right;
        const panelLeft = viewportWidth - panelRight - panelWidth;
        if (panelLeft < 8) {
          panelRight = viewportWidth - panelWidth - 8;
        }
        this.elements.panel.style.top = panelTop + "px";
        this.elements.panel.style.right = panelRight + "px";
        this.elements.panel.style.left = "";
        this.elements.panel.style.height = "auto";
        this.elements.panel.style.maxHeight = "calc(100vh - " + panelTop + "px)";
      }
    },
    /**
     * Bind events specifically for the panel (called after dynamic creation)
     */
    bindPanelEvents: function() {
      if (!this.elements.panel) return;
      if (this.elements.panel.getAttribute("data-customizer-initialized") === "true") return;
      this.elements.panel.setAttribute("data-customizer-initialized", "true");
      this.elements.panel.querySelectorAll("[data-color]").forEach((swatch) => {
        this.addListener(swatch, "click", () => {
          this.applyPrimary(swatch.dataset.color);
          this.updateUI();
        });
      });
      this.elements.panel.querySelectorAll("[data-neutral]").forEach((swatch) => {
        this.addListener(swatch, "click", () => {
          this.applyNeutral(swatch.dataset.neutral);
          this.updateUI();
        });
      });
      this.elements.panel.querySelectorAll("[data-radius]").forEach((btn) => {
        this.addListener(btn, "click", () => {
          this.applyRadius(btn.dataset.radius);
          this.updateUI();
        });
      });
      const fontSelect = this.elements.panel.querySelector("[data-customizer-font]");
      if (fontSelect) {
        this.addListener(fontSelect, "change", (e) => {
          this.applyFont(e.target.value);
          this.updateUI();
        });
      }
      this.elements.panel.querySelectorAll("[data-mode]").forEach((btn) => {
        this.addListener(btn, "click", () => {
          this.applyTheme(btn.dataset.mode);
          this.updateUI();
        });
      });
      const resetBtn = this.elements.panel.querySelector(".customizer-reset");
      if (resetBtn) {
        this.addListener(resetBtn, "click", () => {
          this.reset();
        });
      }
      const closeBtn = this.elements.panel.querySelector(".customizer-mobile-close");
      if (closeBtn) {
        this.addListener(closeBtn, "click", () => {
          this.close();
        });
      }
      if (this.elements.overlay) {
        this.addListener(this.elements.overlay, "click", () => {
          this.close();
        });
      }
    },
    /**
     * Generate panel HTML
     */
    getPanelHTML: function() {
      const esc = typeof escapeHtml === "function" ? escapeHtml : function(text) {
        const div = document.createElement("div");
        div.textContent = String(text ?? "");
        return div.innerHTML;
      };
      const safeColor = function(value) {
        const normalized = String(value ?? "").trim();
        if (/^(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]{1,60}\)|hsl[a]?\([^)]{1,60}\)|var\(--[a-zA-Z0-9_-]{1,40}\))$/.test(normalized)) {
          return normalized;
        }
        return "#000000";
      };
      let primarySwatches = "";
      for (const [key, value] of Object.entries(this.PRIMARY_COLORS)) {
        primarySwatches += `<button class="tc-color-swatch${key === this.state.primary ? " is-active" : ""}" data-color="${esc(key)}" style="--swatch-color: ${safeColor(value.color)}" title="${esc(value.name)}"></button>`;
      }
      let neutralSwatches = "";
      for (const [key, value] of Object.entries(this.NEUTRAL_COLORS)) {
        neutralSwatches += `<button class="tc-neutral-swatch${key === this.state.neutral ? " is-active" : ""}" data-neutral="${esc(key)}" style="--swatch-color: ${safeColor(value.color)}" title="${esc(value.name)}"><span>${esc(value.name)}</span></button>`;
      }
      let radiusButtons = "";
      this.RADIUS_OPTIONS.forEach((r) => {
        radiusButtons += `<button class="tc-radius-btn${r === this.state.radius ? " is-active" : ""}" data-radius="${esc(r)}">${esc(r)}</button>`;
      });
      let fontOptions = "";
      for (const [key, value] of Object.entries(this.FONT_OPTIONS)) {
        fontOptions += `<option value="${esc(key)}"${key === this.state.font ? " selected" : ""}>${esc(value.name)}</option>`;
      }
      const modeIcons = {
        "system": "ph-desktop",
        "dark": "ph-moon",
        "light": "ph-sun"
      };
      let modeButtons = "";
      this.THEME_MODES.forEach((mode) => {
        modeButtons += `<button class="tc-mode-btn${mode === this.state.theme ? " is-active" : ""}" data-mode="${mode}"><i class="ph ${modeIcons[mode]}"></i><span>${mode.charAt(0).toUpperCase() + mode.slice(1)}</span></button>`;
      });
      return `
        <div class="tc-header">
          <h3 class="tc-title">Customize Theme</h3>
          <button class="customizer-mobile-close" aria-label="Close">
            <i class="ph ph-x"></i>
          </button>
        </div>
        <div class="tc-body">
          <div class="tc-section">
            <label class="tc-label">Color Mode</label>
            <div class="tc-mode-group">
              ${modeButtons}
            </div>
          </div>
          <div class="tc-section">
            <label class="tc-label">Primary Color</label>
            <div class="tc-color-grid">
              ${primarySwatches}
            </div>
          </div>
          <div class="tc-section">
            <label class="tc-label">Neutral Color</label>
            <div class="tc-neutral-grid">
              ${neutralSwatches}
            </div>
          </div>
          <div class="tc-section">
            <label class="tc-label">Border Radius</label>
            <div class="tc-radius-group">
              ${radiusButtons}
            </div>
          </div>
          <div class="tc-section">
            <label class="tc-label">Font Family</label>
            <select class="tc-font-select" data-customizer-font>
              ${fontOptions}
            </select>
          </div>
        </div>
        <div class="tc-footer">
          <button class="customizer-reset btn btn-sm btn-outline">Reset to Defaults</button>
        </div>
      `;
    },
    /**
     * Bind event listeners
     */
    /**
     * Check whether the current primary color is one of the auto-defaults
     * (i.e. the user hasn't explicitly picked a non-default color).
     */
    isUsingDefaultPrimary: function() {
      return this.state.primary === this.DEFAULTS.PRIMARY_LIGHT || this.state.primary === this.DEFAULTS.PRIMARY_DARK;
    },
    bindEvents: function() {
      if (this.elements.trigger) {
        this.addListener(this.elements.trigger, "click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.toggle();
        });
      }
      this.bindPanelEvents();
      if (window.matchMedia) {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => {
          if (this.state.theme === "system" && this.isUsingDefaultPrimary()) {
            const newDefault = this.getDefaultPrimary("system");
            if (newDefault !== this.state.primary) {
              this.applyPrimary(newDefault);
              this.updateUI();
            }
          }
        };
        mq.addEventListener("change", handler);
        this._cleanup.push(() => mq.removeEventListener("change", handler));
      }
      this.addListener(document, "click", (e) => {
        if (this.state.isOpen && this.elements.customizer && !this.elements.customizer.contains(e.target)) {
          this.close();
        }
      });
      this.addListener(document, "keydown", (e) => {
        if (e.key === "Escape" && this.state.isOpen) {
          this.close();
        }
      });
    },
    /**
     * Toggle panel open/close
     */
    toggle: function() {
      if (this.state.isOpen) {
        this.close();
      } else {
        this.open();
      }
    },
    /**
     * Open the panel
     */
    open: function() {
      this.state.isOpen = true;
      this.positionPanel();
      if (this.elements.panel) {
        this.elements.panel.classList.add("is-open");
      }
      if (this.elements.trigger) {
        this.elements.trigger.setAttribute("aria-expanded", "true");
      }
      if (this.elements.overlay) {
        this.elements.overlay.classList.add("is-active");
      }
      this.dispatchEvent("panel-open", { isOpen: true });
    },
    /**
     * Close the panel
     */
    close: function() {
      this.state.isOpen = false;
      if (this.elements.panel) {
        this.elements.panel.classList.remove("is-open");
      }
      if (this.elements.trigger) {
        this.elements.trigger.setAttribute("aria-expanded", "false");
      }
      if (this.elements.overlay) {
        this.elements.overlay.classList.remove("is-active");
      }
      this.dispatchEvent("panel-close", { isOpen: false });
    },
    /**
     * Update UI to reflect current state
     */
    updateUI: function() {
      if (!this.elements.panel) return;
      this.elements.panel.querySelectorAll("[data-color]").forEach((swatch) => {
        swatch.classList.toggle("is-active", swatch.dataset.color === this.state.primary);
      });
      this.elements.panel.querySelectorAll("[data-neutral]").forEach((swatch) => {
        swatch.classList.toggle("is-active", swatch.dataset.neutral === this.state.neutral);
      });
      this.elements.panel.querySelectorAll("[data-radius]").forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.radius === this.state.radius);
      });
      const fontSelect = this.elements.panel.querySelector("[data-customizer-font]");
      if (fontSelect) {
        fontSelect.value = this.state.font;
      }
      this.elements.panel.querySelectorAll("[data-mode]").forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.mode === this.state.theme);
      });
    },
    /**
     * Reset all preferences to defaults
     */
    reset: function() {
      this.applyTheme(this.DEFAULTS.THEME);
      this.applyPrimary(this.getDefaultPrimary(this.DEFAULTS.THEME));
      this.applyNeutral(this.DEFAULTS.NEUTRAL);
      this.applyRadius(this.DEFAULTS.RADIUS);
      this.applyFont(this.DEFAULTS.FONT);
      this.applyTheme(this.DEFAULTS.THEME);
      this.updateUI();
      this.dispatchEvent("reset", { state: { ...this.state } });
    },
    /**
     * Get current state
     */
    getState: function() {
      return { ...this.state };
    },
    /**
     * Programmatically set preferences
     */
    setPreferences: function(prefs) {
      if (prefs.primary) this.applyPrimary(prefs.primary);
      if (prefs.neutral) this.applyNeutral(prefs.neutral);
      if (prefs.radius) this.applyRadius(prefs.radius);
      if (prefs.font) this.applyFont(prefs.font);
      if (prefs.theme) this.applyTheme(prefs.theme);
      this.updateUI();
    },
    getStorageValue: function(key, fallback) {
      if (typeof window.safeStorageGet === "function") {
        return window.safeStorageGet(key, fallback);
      }
      try {
        const value = localStorage.getItem(key);
        return value !== null ? value : fallback;
      } catch (_e) {
        return fallback;
      }
    },
    setStorageValue: function(key, value) {
      if (typeof window.safeStorageSet === "function") {
        return window.safeStorageSet(key, value);
      }
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (_e) {
        return false;
      }
    },
    destroyAll: function() {
      this._cleanup.forEach((fn) => fn());
      this._cleanup = [];
      if (this.elements.panel) {
        this.elements.panel.removeAttribute("data-customizer-initialized");
      }
      this.close();
      this.isInitialized = false;
    }
  };
  if (window.Vanduo) {
    window.Vanduo.register("themeCustomizer", ThemeCustomizer);
  }
  window.ThemeCustomizer = ThemeCustomizer;
})();

// js/components/theme-switcher.js
(function() {
  "use strict";
  const ThemeSwitcher = {
    isInitialized: false,
    _mediaQuery: null,
    _onMediaChange: null,
    init: function() {
      this.STORAGE_KEY = "vanduo-theme-preference";
      this.state = {
        preference: this.getPreference()
        // 'light', 'dark', or 'system'
      };
      if (this.isInitialized) {
        this.applyTheme();
        this.renderUI();
        this.updateUI();
        return;
      }
      this.isInitialized = true;
      this.applyTheme();
      this.listenForSystemChanges();
      this.renderUI();
      console.log("Vanduo Theme Switcher initialized");
    },
    getPreference: function() {
      return this.getStorageValue(this.STORAGE_KEY, "system");
    },
    setPreference: function(pref) {
      this.state.preference = pref;
      this.setStorageValue(this.STORAGE_KEY, pref);
      this.applyTheme();
      this.updateUI();
    },
    getStorageValue: function(key, fallback) {
      if (typeof window.safeStorageGet === "function") {
        return window.safeStorageGet(key, fallback);
      }
      try {
        const value = localStorage.getItem(key);
        return value !== null ? value : fallback;
      } catch (_e) {
        return fallback;
      }
    },
    setStorageValue: function(key, value) {
      if (typeof window.safeStorageSet === "function") {
        return window.safeStorageSet(key, value);
      }
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (_e) {
        return false;
      }
    },
    applyTheme: function() {
      const pref = this.state.preference;
      if (pref === "system") {
        document.documentElement.removeAttribute("data-theme");
      } else {
        document.documentElement.setAttribute("data-theme", pref);
      }
    },
    listenForSystemChanges: function() {
      if (this._mediaQuery && this._onMediaChange) {
        return;
      }
      this._mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      this._onMediaChange = (_e) => {
        if (this.state.preference === "system") {
          this.applyTheme();
        }
      };
      this._mediaQuery.addEventListener("change", this._onMediaChange);
    },
    // Helper to facilitate UI creation if needed, though often UI is in HTML
    renderUI: function() {
      const toggles = document.querySelectorAll('[data-toggle="theme"]');
      toggles.forEach((toggle) => {
        if (toggle.getAttribute("data-theme-initialized") === "true") {
          if (toggle.tagName === "SELECT") {
            toggle.value = this.state.preference;
          }
          return;
        }
        if (toggle.tagName === "SELECT") {
          toggle.value = this.state.preference;
          const onChange = (e) => {
            this.setPreference(e.target.value);
          };
          toggle.addEventListener("change", onChange);
          toggle._themeToggleHandler = onChange;
        } else {
          const onClick = () => {
            const modes = ["system", "light", "dark"];
            const nextIndex = (modes.indexOf(this.state.preference) + 1) % modes.length;
            this.setPreference(modes[nextIndex]);
          };
          toggle.addEventListener("click", onClick);
          toggle._themeToggleHandler = onClick;
        }
        toggle.setAttribute("data-theme-initialized", "true");
      });
    },
    updateUI: function() {
      const toggles = document.querySelectorAll('[data-toggle="theme"]');
      toggles.forEach((toggle) => {
        if (toggle.tagName === "SELECT") {
          toggle.value = this.state.preference;
        } else {
          const span = toggle.querySelector(".theme-current-label");
          if (span) {
            span.textContent = this.state.preference.charAt(0).toUpperCase() + this.state.preference.slice(1);
          }
        }
      });
    },
    destroyAll: function() {
      const toggles = document.querySelectorAll('[data-toggle="theme"][data-theme-initialized="true"]');
      toggles.forEach((toggle) => {
        if (toggle._themeToggleHandler) {
          const eventName = toggle.tagName === "SELECT" ? "change" : "click";
          toggle.removeEventListener(eventName, toggle._themeToggleHandler);
          delete toggle._themeToggleHandler;
        }
        toggle.removeAttribute("data-theme-initialized");
      });
      if (this._mediaQuery && this._onMediaChange) {
        this._mediaQuery.removeEventListener("change", this._onMediaChange);
      }
      this._mediaQuery = null;
      this._onMediaChange = null;
      this.isInitialized = false;
    }
  };
  if (window.Vanduo) {
    window.Vanduo.register("themeSwitcher", ThemeSwitcher);
  }
})();

// js/components/toast.js
(function() {
  "use strict";
  const Toast = {
    // Default options
    defaults: {
      position: "top-right",
      duration: 5e3,
      dismissible: true,
      showProgress: true,
      pauseOnHover: true
    },
    // Container cache
    containers: {},
    /**
     * Get or create a toast container for a position
     * @param {string} position - Container position
     * @returns {HTMLElement} Toast container element
     */
    getContainer: function(position) {
      if (this.containers[position]) {
        return this.containers[position];
      }
      const container = document.createElement("div");
      container.className = `vd-toast-container vd-toast-container-${position}`;
      container.setAttribute("role", "status");
      container.setAttribute("aria-live", "polite");
      container.setAttribute("aria-atomic", "false");
      document.body.appendChild(container);
      this.containers[position] = container;
      return container;
    },
    /**
     * Show a toast notification
     * @param {Object|string} options - Toast options or message string
     * @param {string} [type] - Toast type (success, error, warning, info)
     * @param {number} [duration] - Auto-dismiss duration in ms
     * @returns {HTMLElement} Toast element
     */
    show: function(options, type, duration) {
      if (typeof options === "string") {
        options = {
          message: options,
          type,
          duration
        };
      }
      const config = Object.assign({}, this.defaults, options);
      const container = this.getContainer(config.position);
      const toast = document.createElement("div");
      toast.className = "vd-toast";
      if (config.type) {
        toast.classList.add(`vd-toast-${config.type}`);
      }
      if (config.solid) {
        toast.classList.add("vd-toast-solid");
      }
      if (config.showProgress && config.duration > 0) {
        toast.classList.add("vd-toast-with-progress");
      }
      let html = "";
      if (config.icon) {
        const safeIcon = typeof sanitizeHtml === "function" ? sanitizeHtml(config.icon) : escapeHtml(config.icon);
        html += `<span class="vd-toast-icon">${safeIcon}</span>`;
      } else if (config.type) {
        html += `<span class="vd-toast-icon">${this.getDefaultIcon(config.type)}</span>`;
      }
      const _esc = typeof escapeHtml === "function" ? escapeHtml : function(s) {
        const d = document.createElement("div");
        d.appendChild(document.createTextNode(s));
        return d.innerHTML;
      };
      html += '<div class="vd-toast-content">';
      if (config.title) {
        html += `<div class="vd-toast-title">${_esc(String(config.title))}</div>`;
      }
      if (config.message) {
        html += `<div class="vd-toast-message">${_esc(String(config.message))}</div>`;
      }
      html += "</div>";
      if (config.dismissible) {
        html += '<button type="button" class="vd-toast-close" aria-label="Close"></button>';
      }
      if (config.showProgress && config.duration > 0) {
        const safeDuration = parseInt(config.duration, 10) || 0;
        html += `<div class="vd-toast-progress" style="animation-duration: ${safeDuration}ms"></div>`;
      }
      toast.innerHTML = html;
      container.appendChild(toast);
      toast._toastCleanup = [];
      if (config.dismissible) {
        const closeBtn = toast.querySelector(".vd-toast-close");
        const onClose = () => {
          this.dismiss(toast);
        };
        closeBtn.addEventListener("click", onClose);
        toast._toastCleanup.push(() => closeBtn.removeEventListener("click", onClose));
      }
      let timeoutId = null;
      let remainingTime = config.duration;
      let startTime = null;
      const startTimer = () => {
        if (config.duration > 0) {
          startTime = Date.now();
          timeoutId = setTimeout(() => {
            this.dismiss(toast);
          }, remainingTime);
          toast._toastTimeoutId = timeoutId;
          const progress = toast.querySelector(".vd-toast-progress");
          if (progress) {
            progress.style.animationPlayState = "running";
          }
        }
      };
      const pauseTimer = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
          toast._toastTimeoutId = null;
          remainingTime -= Date.now() - startTime;
          const progress = toast.querySelector(".vd-toast-progress");
          if (progress) {
            progress.style.animationPlayState = "paused";
          }
        }
      };
      if (config.pauseOnHover) {
        toast.addEventListener("mouseenter", pauseTimer);
        toast.addEventListener("mouseleave", startTimer);
        toast._toastCleanup.push(
          () => toast.removeEventListener("mouseenter", pauseTimer),
          () => toast.removeEventListener("mouseleave", startTimer)
        );
      }
      requestAnimationFrame(() => {
        toast.classList.add("is-visible");
        startTimer();
      });
      toast._toastConfig = config;
      const showEvent = new CustomEvent("toast:show", {
        bubbles: true,
        detail: { toast, config }
      });
      toast.dispatchEvent(showEvent);
      return toast;
    },
    /**
     * Dismiss a toast
     * @param {HTMLElement} toast - Toast element to dismiss
     */
    dismiss: function(toast) {
      if (!toast || toast.classList.contains("is-exiting")) return;
      if (toast._toastTimeoutId) {
        clearTimeout(toast._toastTimeoutId);
        toast._toastTimeoutId = null;
      }
      toast.classList.remove("is-visible");
      toast.classList.add("is-exiting");
      const dismissEvent = new CustomEvent("toast:dismiss", {
        bubbles: true,
        detail: { toast }
      });
      toast.dispatchEvent(dismissEvent);
      const handleTransitionEnd = () => {
        toast.removeEventListener("transitionend", handleTransitionEnd);
        if (toast._toastCleanup) {
          toast._toastCleanup.forEach((fn) => fn());
          delete toast._toastCleanup;
        }
        if (toast.parentElement) {
          toast.parentElement.removeChild(toast);
        }
      };
      toast.addEventListener("transitionend", handleTransitionEnd);
      setTimeout(() => {
        if (toast._toastCleanup) {
          toast._toastCleanup.forEach((fn) => fn());
          delete toast._toastCleanup;
        }
        if (toast.parentElement) {
          toast.parentElement.removeChild(toast);
        }
      }, 400);
    },
    /**
     * Destroy all toasts and containers
     */
    destroyAll: function() {
      Object.keys(this.containers).forEach((position) => {
        const container = this.containers[position];
        if (!container) return;
        const toasts = container.querySelectorAll(".vd-toast");
        toasts.forEach((toast) => {
          if (toast._toastTimeoutId) {
            clearTimeout(toast._toastTimeoutId);
          }
          if (toast._toastCleanup) {
            toast._toastCleanup.forEach((fn) => fn());
            delete toast._toastCleanup;
          }
          if (toast.parentElement) {
            toast.parentElement.removeChild(toast);
          }
        });
        if (container.parentElement) {
          container.parentElement.removeChild(container);
        }
      });
      this.containers = {};
    },
    /**
     * Dismiss all toasts
     * @param {string} [position] - Optional position to clear (clears all if not specified)
     */
    dismissAll: function(position) {
      if (position && this.containers[position]) {
        const toasts = this.containers[position].querySelectorAll(".vd-toast");
        toasts.forEach((toast) => this.dismiss(toast));
      } else {
        Object.values(this.containers).forEach((container) => {
          const toasts = container.querySelectorAll(".vd-toast");
          toasts.forEach((toast) => this.dismiss(toast));
        });
      }
    },
    /**
     * Get default icon SVG for a type
     * @param {string} type - Toast type
     * @returns {string} SVG icon markup
     */
    getDefaultIcon: function(type) {
      const icons = {
        success: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
        error: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
        warning: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
        info: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
      };
      return icons[type] || "";
    },
    /**
     * Convenience methods for common toast types
     */
    success: function(message, options) {
      return this.show(Object.assign({ message, type: "success" }, options));
    },
    error: function(message, options) {
      return this.show(Object.assign({ message, type: "error" }, options));
    },
    warning: function(message, options) {
      return this.show(Object.assign({ message, type: "warning" }, options));
    },
    info: function(message, options) {
      return this.show(Object.assign({ message, type: "info" }, options));
    }
  };
  if (typeof window.Vanduo !== "undefined") {
    window.Vanduo.register("toast", Toast);
  }
  window.Toast = Toast;
})();

// js/components/tooltips.js
(function() {
  "use strict";
  const Tooltips = {
    tooltips: /* @__PURE__ */ new Map(),
    delayTimers: /* @__PURE__ */ new Map(),
    /**
     * Sanitize HTML — delegates to shared sanitizeHtml from helpers.js
     * @param {string} input
     * @returns {string} sanitized HTML
     */
    sanitizeHtml: function(input) {
      if (typeof sanitizeHtml === "function") {
        return sanitizeHtml(input);
      }
      const div = document.createElement("div");
      div.textContent = input || "";
      return div.innerHTML;
    },
    /**
     * Initialize tooltips
     */
    init: function() {
      const elements = document.querySelectorAll("[data-tooltip], [data-tooltip-html]");
      elements.forEach((element) => {
        if (this.tooltips.has(element)) {
          return;
        }
        this.initTooltip(element);
      });
    },
    /**
     * Initialize a single tooltip
     * @param {HTMLElement} element - Element with tooltip
     */
    initTooltip: function(element) {
      const tooltip = this.createTooltip(element);
      const cleanupFunctions = [];
      const enterHandler = () => {
        this.showTooltip(element, tooltip);
      };
      const leaveHandler = () => {
        this.hideTooltip(element, tooltip);
      };
      const focusHandler = () => {
        this.showTooltip(element, tooltip);
      };
      const blurHandler = () => {
        this.hideTooltip(element, tooltip);
      };
      element.addEventListener("mouseenter", enterHandler);
      element.addEventListener("mouseleave", leaveHandler);
      element.addEventListener("focus", focusHandler);
      element.addEventListener("blur", blurHandler);
      cleanupFunctions.push(
        () => element.removeEventListener("mouseenter", enterHandler),
        () => element.removeEventListener("mouseleave", leaveHandler),
        () => element.removeEventListener("focus", focusHandler),
        () => element.removeEventListener("blur", blurHandler)
      );
      this.tooltips.set(element, { tooltip, cleanup: cleanupFunctions });
    },
    /**
     * Create tooltip element
     * @param {HTMLElement} element - Target element
     * @returns {HTMLElement} Tooltip element
     */
    createTooltip: function(element) {
      const tooltip = document.createElement("div");
      tooltip.className = "vd-tooltip";
      tooltip.setAttribute("role", "tooltip");
      tooltip.setAttribute("aria-hidden", "true");
      const tooltipId = "tooltip-" + Math.random().toString(36).substr(2, 9);
      tooltip.id = tooltipId;
      element.setAttribute("aria-describedby", tooltipId);
      const htmlContent = element.dataset.tooltipHtml;
      const textContent = element.dataset.tooltip;
      if (htmlContent) {
        tooltip.innerHTML = this.sanitizeHtml(htmlContent);
        tooltip.classList.add("vd-tooltip-html");
      } else if (textContent) {
        tooltip.textContent = textContent;
      }
      const placement = element.dataset.tooltipPlacement || element.dataset.placement || "top";
      tooltip.setAttribute("data-placement", placement);
      tooltip.classList.add(`vd-tooltip-${placement}`);
      if (element.dataset.tooltipVariant) {
        tooltip.classList.add(`vd-tooltip-${element.dataset.tooltipVariant}`);
      }
      if (element.dataset.tooltipSize) {
        tooltip.classList.add(`vd-tooltip-${element.dataset.tooltipSize}`);
      }
      const delay = parseInt(element.dataset.tooltipDelay) || 0;
      tooltip.dataset.delay = delay;
      document.body.appendChild(tooltip);
      return tooltip;
    },
    /**
     * Show tooltip
     * @param {HTMLElement} element - Target element
     * @param {HTMLElement} tooltip - Tooltip element
     */
    showTooltip: function(element, tooltip) {
      const delay = parseInt(tooltip.dataset.delay) || 0;
      if (delay > 0) {
        const timer = setTimeout(() => {
          this.positionTooltip(element, tooltip);
          tooltip.classList.add("is-visible");
          tooltip.setAttribute("aria-hidden", "false");
        }, delay);
        this.delayTimers.set(element, timer);
      } else {
        this.positionTooltip(element, tooltip);
        tooltip.classList.add("is-visible");
        tooltip.setAttribute("aria-hidden", "false");
      }
    },
    /**
     * Hide tooltip
     * @param {HTMLElement} element - Target element
     * @param {HTMLElement} tooltip - Tooltip element
     */
    hideTooltip: function(element, tooltip) {
      const timer = this.delayTimers.get(element);
      if (timer) {
        clearTimeout(timer);
        this.delayTimers.delete(element);
      }
      tooltip.classList.remove("is-visible");
      tooltip.setAttribute("aria-hidden", "true");
    },
    /**
     * Position tooltip relative to element
     * @param {HTMLElement} element - Target element
     * @param {HTMLElement} tooltip - Tooltip element
     */
    positionTooltip: function(element, tooltip) {
      const placement = tooltip.dataset.placement || "top";
      const rect = element.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      let top = 0;
      let left = 0;
      switch (placement) {
        case "top":
          top = rect.top + scrollTop - tooltipRect.height - 8;
          left = rect.left + scrollLeft + rect.width / 2 - tooltipRect.width / 2;
          break;
        case "bottom":
          top = rect.bottom + scrollTop + 8;
          left = rect.left + scrollLeft + rect.width / 2 - tooltipRect.width / 2;
          break;
        case "left":
          top = rect.top + scrollTop + rect.height / 2 - tooltipRect.height / 2;
          left = rect.left + scrollLeft - tooltipRect.width - 8;
          break;
        case "right":
          top = rect.top + scrollTop + rect.height / 2 - tooltipRect.height / 2;
          left = rect.right + scrollLeft + 8;
          break;
      }
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 8;
      if (left < padding) {
        left = padding;
      } else if (left + tooltipRect.width > viewportWidth - padding) {
        left = viewportWidth - tooltipRect.width - padding;
      }
      if (top < scrollTop + padding) {
        top = scrollTop + padding;
      } else if (top + tooltipRect.height > scrollTop + viewportHeight - padding) {
        top = scrollTop + viewportHeight - tooltipRect.height - padding;
      }
      tooltip.style.cssText = `position: absolute; top: 0; left: 0; transform: translate(${left}px, ${top}px);`;
    },
    /**
     * Show tooltip programmatically
     * @param {HTMLElement|string} element - Target element or selector
     */
    show: function(element) {
      const el = typeof element === "string" ? document.querySelector(element) : element;
      if (el && this.tooltips.has(el)) {
        const { tooltip } = this.tooltips.get(el);
        this.showTooltip(el, tooltip);
      }
    },
    /**
     * Hide tooltip programmatically
     * @param {HTMLElement|string} element - Target element or selector
     */
    hide: function(element) {
      const el = typeof element === "string" ? document.querySelector(element) : element;
      if (el && this.tooltips.has(el)) {
        const { tooltip } = this.tooltips.get(el);
        this.hideTooltip(el, tooltip);
      }
    },
    /**
     * Update tooltip content
     * @param {HTMLElement|string} element - Target element or selector
     * @param {string} content - New content
     * @param {boolean} isHtml - Whether content is HTML
     */
    update: function(element, content, isHtml = false) {
      const el = typeof element === "string" ? document.querySelector(element) : element;
      if (el && this.tooltips.has(el)) {
        const { tooltip } = this.tooltips.get(el);
        if (isHtml) {
          tooltip.innerHTML = this.sanitizeHtml(content);
          tooltip.classList.add("vd-tooltip-html");
        } else {
          tooltip.textContent = content;
          tooltip.classList.remove("vd-tooltip-html");
        }
      }
    },
    /**
     * Destroy a tooltip instance and clean up
     * @param {HTMLElement} element - Element with tooltip
     */
    destroy: function(element) {
      const data = this.tooltips.get(element);
      if (!data) return;
      const timer = this.delayTimers.get(element);
      if (timer) {
        clearTimeout(timer);
        this.delayTimers.delete(element);
      }
      data.cleanup.forEach((fn) => fn());
      if (data.tooltip && data.tooltip.parentNode) {
        data.tooltip.parentNode.removeChild(data.tooltip);
      }
      this.tooltips.delete(element);
    },
    /**
     * Destroy all tooltip instances
     */
    destroyAll: function() {
      this.tooltips.forEach((data, element) => {
        this.destroy(element);
      });
    }
  };
  if (typeof window.Vanduo !== "undefined") {
    window.Vanduo.register("tooltips", Tooltips);
  }
  window.VanduoTooltips = Tooltips;
})();

// js/components/doc-search.js
(function() {
  "use strict";
  const DEFAULTS = {
    // Behavior
    minQueryLength: 2,
    maxResults: 10,
    debounceMs: 150,
    highlightTag: "mark",
    keyboardShortcut: true,
    // Enable Cmd/Ctrl+K shortcut
    // Selectors (for DOM-based indexing)
    containerSelector: ".vd-doc-search",
    inputSelector: ".vd-doc-search-input",
    resultsSelector: ".vd-doc-search-results",
    contentSelector: ".doc-content section[id]",
    titleSelector: ".demo-title, h2, h3",
    navSelector: ".doc-nav-link",
    sectionSelector: ".doc-nav-section",
    // Content extraction
    excludeFromContent: "pre, code, script, style",
    maxContentLength: 500,
    // Custom data source (alternative to DOM indexing)
    data: null,
    // Category icons mapping
    categoryIcons: {
      "getting-started": "ph-rocket-launch",
      "core": "ph-cube",
      "components": "ph-puzzle-piece",
      "interactive": "ph-cursor-click",
      "data-display": "ph-table",
      "feedback": "ph-bell",
      "meta": "ph-info",
      "default": "ph-file-text"
    },
    // Callbacks
    onSelect: null,
    // function(result) - called when result is selected
    onSearch: null,
    // function(query, results) - called after search
    onOpen: null,
    // function() - called when results open
    onClose: null,
    // function() - called when results close
    // Text customization
    emptyTitle: "No results found",
    emptyText: "Try different keywords or check spelling",
    placeholder: "Search..."
  };
  function createSearch(options) {
    const config = Object.assign({}, DEFAULTS, options || {});
    const state = {
      initialized: false,
      index: [],
      results: [],
      activeIndex: -1,
      isOpen: false,
      query: "",
      container: null,
      input: null,
      resultsContainer: null,
      debounceTimer: null,
      boundHandlers: {}
    };
    function safeInvokeCallback(name, fn, ...args) {
      try {
        fn(...args);
      } catch (error) {
        console.warn('[Vanduo Search] Callback error in "' + name + '":', error);
      }
    }
    function setResultsHtml(html) {
      if (!state.resultsContainer) return;
      try {
        state.resultsContainer.innerHTML = html;
      } catch (error) {
        console.warn("[Vanduo Search] Failed to render results:", error);
      }
    }
    function init() {
      if (state.initialized) {
        return instance;
      }
      state.container = document.querySelector(config.containerSelector);
      if (!state.container) {
        state.initialized = false;
        return null;
      }
      state.input = state.container.querySelector(config.inputSelector);
      state.resultsContainer = state.container.querySelector(config.resultsSelector);
      if (!state.input || !state.resultsContainer) {
        state.initialized = false;
        return null;
      }
      if (config.placeholder) {
        state.input.setAttribute("placeholder", config.placeholder);
      }
      buildIndex();
      bindEvents();
      setupAria();
      state.initialized = true;
      return instance;
    }
    function buildIndex() {
      state.index = [];
      if (config.data && Array.isArray(config.data)) {
        config.data.forEach(function(item) {
          state.index.push({
            id: item.id || slugify(item.title),
            title: item.title || "",
            category: item.category || "",
            categorySlug: slugify(item.category || ""),
            content: item.content || "",
            keywords: item.keywords || extractKeywordsFromText(item.title + " " + item.content),
            url: item.url || "#" + (item.id || slugify(item.title)),
            icon: item.icon || ""
          });
        });
        return;
      }
      const sections = document.querySelectorAll(config.contentSelector);
      const categoryMap = buildCategoryMap();
      sections.forEach(function(section) {
        const id = section.id;
        if (!id) return;
        const titleEl = section.querySelector(config.titleSelector);
        const title = titleEl ? titleEl.textContent.replace(/v[\d.]+/g, "").trim() : id;
        const category = categoryMap[id] || "Documentation";
        const content = extractContent(section);
        const keywords = extractKeywords(section, title);
        const iconEl = titleEl ? titleEl.querySelector("i.ph") : null;
        let icon = "";
        if (iconEl && iconEl.classList) {
          for (let ci = 0; ci < iconEl.classList.length; ci++) {
            if (iconEl.classList[ci].indexOf("ph-") === 0) {
              icon = iconEl.classList[ci];
              break;
            }
          }
        }
        state.index.push({
          id,
          title,
          category,
          categorySlug: slugify(category),
          content,
          keywords,
          url: "#" + id,
          icon
        });
      });
    }
    function buildCategoryMap() {
      const map = {};
      let currentCategory = "Documentation";
      const navItems = document.querySelectorAll(config.navSelector + ", " + config.sectionSelector);
      navItems.forEach(function(item) {
        if (item.classList.contains("doc-nav-section")) {
          currentCategory = item.textContent.trim();
        } else {
          const href = item.getAttribute("href");
          if (href && href.startsWith("#")) {
            const id = href.substring(1);
            map[id] = currentCategory;
          }
        }
      });
      return map;
    }
    function extractContent(section) {
      const clone = section.cloneNode(true);
      const toRemove = clone.querySelectorAll(config.excludeFromContent);
      toRemove.forEach(function(el) {
        el.remove();
      });
      let text = clone.textContent || "";
      text = text.replace(/\s+/g, " ").trim();
      return text.substring(0, config.maxContentLength);
    }
    function extractKeywords(section, title) {
      const keywords = [];
      title.toLowerCase().split(/\s+/).forEach(function(word) {
        if (word.length > 2) {
          keywords.push(word);
        }
      });
      const codeBlocks = section.querySelectorAll("code");
      codeBlocks.forEach(function(code) {
        const text = code.textContent || "";
        const classMatches = text.match(/\.([\w-]+)/g);
        if (classMatches) {
          classMatches.forEach(function(match) {
            keywords.push(match.substring(1).toLowerCase());
          });
        }
      });
      const dataAttrs = section.querySelectorAll("[data-tooltip], [data-modal]");
      dataAttrs.forEach(function(el) {
        const attrs = el.getAttributeNames().filter(function(name) {
          return name.startsWith("data-");
        });
        attrs.forEach(function(attr) {
          keywords.push(attr.replace("data-", ""));
        });
      });
      return Array.from(new Set(keywords));
    }
    function extractKeywordsFromText(text) {
      const words = text.toLowerCase().split(/\s+/);
      return words.filter(function(word) {
        return word.length > 2;
      });
    }
    function slugify(str) {
      return str.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    }
    function bindEvents() {
      state.boundHandlers.handleInput = function(e) {
        handleInput(e);
      };
      state.boundHandlers.handleFocus = function() {
        if (state.query.length >= config.minQueryLength) {
          open();
        }
      };
      state.boundHandlers.handleKeydown = function(e) {
        handleKeydown(e);
      };
      state.boundHandlers.handleOutsideClick = function(e) {
        if (!state.container.contains(e.target)) {
          close();
        }
      };
      state.boundHandlers.handleGlobalKeydown = function(e) {
        if (config.keyboardShortcut && (e.metaKey || e.ctrlKey) && e.key === "k") {
          e.preventDefault();
          state.input.focus();
          state.input.select();
        }
      };
      state.boundHandlers.handleResultClick = function(e) {
        const result = e.target.closest(".vd-doc-search-result");
        if (result) {
          const index = parseInt(result.dataset.index, 10);
          select(index);
        }
      };
      state.input.addEventListener("input", state.boundHandlers.handleInput);
      state.input.addEventListener("focus", state.boundHandlers.handleFocus);
      state.input.addEventListener("keydown", state.boundHandlers.handleKeydown);
      document.addEventListener("click", state.boundHandlers.handleOutsideClick);
      document.addEventListener("keydown", state.boundHandlers.handleGlobalKeydown);
      state.resultsContainer.addEventListener("click", state.boundHandlers.handleResultClick);
    }
    function unbindEvents() {
      if (state.input) {
        state.input.removeEventListener("input", state.boundHandlers.handleInput);
        state.input.removeEventListener("focus", state.boundHandlers.handleFocus);
        state.input.removeEventListener("keydown", state.boundHandlers.handleKeydown);
      }
      document.removeEventListener("click", state.boundHandlers.handleOutsideClick);
      document.removeEventListener("keydown", state.boundHandlers.handleGlobalKeydown);
      if (state.resultsContainer) {
        state.resultsContainer.removeEventListener("click", state.boundHandlers.handleResultClick);
      }
    }
    function setupAria() {
      const resultsId = state.resultsContainer.id || "search-results-" + Math.random().toString(36).substr(2, 9);
      state.resultsContainer.id = resultsId;
      state.input.setAttribute("role", "combobox");
      state.input.setAttribute("aria-autocomplete", "list");
      state.input.setAttribute("aria-controls", resultsId);
      state.input.setAttribute("aria-expanded", "false");
      state.resultsContainer.setAttribute("role", "listbox");
      state.resultsContainer.setAttribute("aria-label", "Search results");
    }
    function handleInput(e) {
      const query = e.target.value.trim();
      if (state.debounceTimer) {
        clearTimeout(state.debounceTimer);
      }
      state.debounceTimer = setTimeout(function() {
        state.query = query;
        if (query.length < config.minQueryLength) {
          close();
          return;
        }
        state.results = search(query);
        state.activeIndex = -1;
        render();
        open();
        if (typeof config.onSearch === "function") {
          safeInvokeCallback("onSearch", config.onSearch, query, state.results);
        }
      }, config.debounceMs);
    }
    function handleKeydown(e) {
      if (!state.isOpen) {
        if (e.key === "ArrowDown" && state.query.length >= config.minQueryLength) {
          e.preventDefault();
          state.results = search(state.query);
          render();
          open();
        }
        return;
      }
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          navigate(1);
          break;
        case "ArrowUp":
          e.preventDefault();
          navigate(-1);
          break;
        case "Enter":
          e.preventDefault();
          if (state.activeIndex >= 0) {
            select(state.activeIndex);
          } else if (state.results.length > 0) {
            select(0);
          }
          break;
        case "Escape":
          e.preventDefault();
          close();
          break;
        case "Tab":
          close();
          break;
      }
    }
    function search(query) {
      const terms = query.toLowerCase().split(/\s+/).filter(function(t) {
        return t.length > 0;
      });
      const scored = [];
      state.index.forEach(function(entry) {
        let score = 0;
        const titleLower = entry.title.toLowerCase();
        const categoryLower = entry.category.toLowerCase();
        const contentLower = entry.content.toLowerCase();
        terms.forEach(function(term) {
          if (titleLower.includes(term)) {
            score += 100;
            if (titleLower === term) {
              score += 50;
            } else if (titleLower.startsWith(term)) {
              score += 25;
            }
          }
          if (categoryLower.includes(term)) {
            score += 50;
          }
          const keywordMatch = entry.keywords.some(function(k) {
            return k.includes(term);
          });
          if (keywordMatch) {
            score += 30;
          }
          if (contentLower.includes(term)) {
            score += 10;
          }
        });
        if (score > 0) {
          scored.push({
            id: entry.id,
            title: entry.title,
            category: entry.category,
            categorySlug: entry.categorySlug,
            content: entry.content,
            url: entry.url,
            icon: entry.icon,
            score
          });
        }
      });
      scored.sort(function(a, b) {
        return b.score - a.score;
      });
      return scored.slice(0, config.maxResults);
    }
    function render() {
      if (state.results.length === 0) {
        setResultsHtml(renderEmpty());
        return;
      }
      let html = '<ul class="vd-doc-search-results-list" role="listbox">';
      state.results.forEach(function(result, index) {
        const isActive = index === state.activeIndex;
        const icon = result.icon || getCategoryIcon(result.categorySlug);
        const excerpt = getExcerpt(result.content, state.query);
        html += '<li class="vd-doc-search-result' + (isActive ? " is-active" : "") + '" role="option" id="vd-doc-search-result-' + index + '" data-index="' + index + '" data-category="' + escapeHtml2(result.categorySlug) + '" aria-selected="' + isActive + '"><div class="vd-doc-search-result-icon"><i class="ph ' + escapeHtml2(icon) + '"></i></div><div class="vd-doc-search-result-content"><div class="vd-doc-search-result-title">' + highlight(result.title, state.query) + '</div><div class="vd-doc-search-result-category">' + escapeHtml2(result.category) + '</div><div class="vd-doc-search-result-excerpt">' + highlight(excerpt, state.query) + "</div></div></li>";
      });
      html += "</ul>";
      html += renderFooter();
      setResultsHtml(html);
    }
    function renderEmpty() {
      return '<div class="vd-doc-search-empty"><div class="vd-doc-search-empty-icon"><i class="ph ph-magnifying-glass"></i></div><div class="vd-doc-search-empty-title">' + escapeHtml2(config.emptyTitle) + '</div><div class="vd-doc-search-empty-text">' + escapeHtml2(config.emptyText) + "</div></div>";
    }
    function renderFooter() {
      return '<div class="vd-doc-search-footer"><span class="vd-doc-search-footer-item"><kbd>\u2191</kbd><kbd>\u2193</kbd> to navigate</span><span class="vd-doc-search-footer-item"><kbd>\u21B5</kbd> to select</span><span class="vd-doc-search-footer-item"><kbd>esc</kbd> to close</span></div>';
    }
    function getCategoryIcon(categorySlug) {
      return config.categoryIcons[categorySlug] || config.categoryIcons["default"] || "ph-file-text";
    }
    function getExcerpt(content, query) {
      const terms = query.toLowerCase().split(/\s+/);
      const contentLower = content.toLowerCase();
      const excerptLength = 100;
      let matchPos = -1;
      for (let i = 0; i < terms.length; i++) {
        const pos = contentLower.indexOf(terms[i]);
        if (pos !== -1 && (matchPos === -1 || pos < matchPos)) {
          matchPos = pos;
        }
      }
      if (matchPos === -1) {
        return content.substring(0, excerptLength) + "...";
      }
      const start = Math.max(0, matchPos - 30);
      const end = Math.min(content.length, matchPos + excerptLength);
      let excerpt = content.substring(start, end);
      if (start > 0) {
        excerpt = "..." + excerpt;
      }
      if (end < content.length) {
        excerpt = excerpt + "...";
      }
      return excerpt;
    }
    function highlight(text, query) {
      if (!query) return escapeHtml2(text);
      const terms = query.toLowerCase().split(/\s+/).filter(function(t) {
        return t.length > 0;
      });
      let escaped = escapeHtml2(text);
      terms.forEach(function(term) {
        if (term.length > 50) return;
        const regex = new RegExp("(" + term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
        escaped = escaped.replace(regex, "<" + config.highlightTag + ">$1</" + config.highlightTag + ">");
      });
      return escaped;
    }
    function escapeHtml2(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
    function navigate(direction) {
      let newIndex = state.activeIndex + direction;
      if (newIndex < 0) {
        newIndex = state.results.length - 1;
      } else if (newIndex >= state.results.length) {
        newIndex = 0;
      }
      setActiveIndex(newIndex);
    }
    function setActiveIndex(index) {
      const prevActive = state.resultsContainer.querySelector(".vd-doc-search-result.is-active");
      if (prevActive) {
        prevActive.classList.remove("is-active");
        prevActive.setAttribute("aria-selected", "false");
      }
      state.activeIndex = index;
      const newActive = state.resultsContainer.querySelector('[data-index="' + index + '"]');
      if (newActive) {
        newActive.classList.add("is-active");
        newActive.setAttribute("aria-selected", "true");
        state.input.setAttribute("aria-activedescendant", "vd-doc-search-result-" + index);
        newActive.scrollIntoView({ block: "nearest" });
      }
    }
    function select(index) {
      const result = state.results[index];
      if (!result) return;
      close();
      state.input.value = "";
      state.query = "";
      if (typeof config.onSelect === "function") {
        safeInvokeCallback("onSelect", config.onSelect, result);
        return;
      }
      const section = document.querySelector(result.url);
      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.pushState(null, "", result.url);
        updateSidebarActive(result.id);
      }
    }
    function updateSidebarActive(sectionId) {
      const navLinks = document.querySelectorAll(config.navSelector);
      navLinks.forEach(function(link) {
        link.classList.remove("active");
        if (link.getAttribute("href") === "#" + sectionId) {
          link.classList.add("active");
        }
      });
    }
    function open() {
      if (state.isOpen) return;
      state.isOpen = true;
      state.resultsContainer.classList.add("is-open");
      state.input.setAttribute("aria-expanded", "true");
      if (typeof config.onOpen === "function") {
        safeInvokeCallback("onOpen", config.onOpen);
      }
    }
    function close() {
      if (!state.isOpen) return;
      state.isOpen = false;
      state.activeIndex = -1;
      state.resultsContainer.classList.remove("is-open");
      state.input.setAttribute("aria-expanded", "false");
      state.input.removeAttribute("aria-activedescendant");
      if (typeof config.onClose === "function") {
        safeInvokeCallback("onClose", config.onClose);
      }
    }
    function destroy() {
      unbindEvents();
      state.initialized = false;
      state.index = [];
      state.results = [];
      state.isOpen = false;
      state.query = "";
      if (state.debounceTimer) {
        clearTimeout(state.debounceTimer);
      }
      if (state.resultsContainer) {
        setResultsHtml("");
      }
    }
    function rebuild() {
      buildIndex();
    }
    function setConfig(newConfig) {
      Object.assign(config, newConfig);
    }
    function getConfig() {
      return Object.assign({}, config);
    }
    function getIndex() {
      return state.index.slice();
    }
    const instance = {
      init,
      destroy,
      rebuild,
      search,
      open,
      close,
      setConfig,
      getConfig,
      getIndex
    };
    return instance;
  }
  const Search = {
    // Factory method — creates and auto-initializes a new independent instance.
    // Always returns the instance so callers retain a reference even if the
    // DOM container is not yet available (they can retry init() later).
    create: function(options) {
      const instance = createSearch(options);
      if (instance) {
        instance.init();
      }
      return instance || null;
    },
    // Default instance
    _instance: null,
    // Configuration (for default instance)
    config: Object.assign({}, DEFAULTS),
    /**
     * Initialize the default search instance
     */
    init: function(options) {
      if (this._instance) {
        this._instance.destroy();
      }
      if (options) {
        Object.assign(this.config, options);
      }
      this._instance = createSearch(this.config);
      return this._instance ? this._instance.init() : null;
    },
    /**
     * Destroy the default instance
     */
    destroy: function() {
      if (this._instance) {
        this._instance.destroy();
        this._instance = null;
      }
    },
    destroyAll: function() {
      this.destroy();
    },
    /**
     * Rebuild the default instance index
     */
    rebuild: function() {
      if (this._instance) {
        this._instance.rebuild();
      }
    },
    /**
     * Search using the default instance
     */
    search: function(query) {
      return this._instance ? this._instance.search(query) : [];
    },
    /**
     * Open the default instance
     */
    open: function() {
      if (this._instance) {
        this._instance.open();
      }
    },
    /**
     * Close the default instance
     */
    close: function() {
      if (this._instance) {
        this._instance.close();
      }
    }
  };
  if (typeof window.Vanduo !== "undefined") {
    window.Vanduo.register("docSearch", Search);
  }
  window.Search = Search;
  window.DocSearch = Search;
  window.VanduoDocSearch = Search;
})();

// js/components/draggable.js
(function() {
  "use strict";
  const Draggable = {
    // Store initialized draggables and their cleanup functions
    instances: /* @__PURE__ */ new Map(),
    // Store current drag state
    currentDrag: null,
    // Store touch state
    touchState: null,
    // Feedback element
    feedbackElement: null,
    /**
     * Initialize draggable components
     */
    init: function() {
      const draggables = document.querySelectorAll(".vd-draggable, [data-draggable]");
      draggables.forEach((element) => {
        if (this.instances.has(element)) {
          return;
        }
        this.initDraggable(element);
      });
      const containers = document.querySelectorAll(".vd-draggable-container, .vd-draggable-container-vertical");
      containers.forEach((container) => {
        if (!this.instances.has(container)) {
          this.initContainer(container);
        }
      });
      const dropZones = document.querySelectorAll(".vd-drop-zone");
      dropZones.forEach((zone) => {
        if (!this.instances.has(zone)) {
          this.initDropZone(zone);
        }
      });
      this.createFeedbackElement();
    },
    /**
     * Initialize a single draggable element
     * @param {HTMLElement} element - Draggable element
     */
    initDraggable: function(element) {
      const cleanupFunctions = [];
      if (!element.hasAttribute("draggable")) {
        element.setAttribute("draggable", "true");
      }
      if (!element.hasAttribute("tabindex")) {
        element.setAttribute("tabindex", "0");
      }
      element.setAttribute("role", "option");
      element.setAttribute("aria-roledescription", "draggable item");
      element.setAttribute("aria-grabbed", "false");
      const dragStartHandler = (e) => {
        this.handleDragStart(e, element);
      };
      element.addEventListener("dragstart", dragStartHandler);
      cleanupFunctions.push(() => element.removeEventListener("dragstart", dragStartHandler));
      const dragHandler = (e) => {
        this.handleDrag(e, element);
      };
      element.addEventListener("drag", dragHandler);
      cleanupFunctions.push(() => element.removeEventListener("drag", dragHandler));
      const dragEndHandler = (e) => {
        this.handleDragEnd(e, element);
      };
      element.addEventListener("dragend", dragEndHandler);
      cleanupFunctions.push(() => element.removeEventListener("dragend", dragEndHandler));
      const touchStartHandler = (e) => {
        this.handleTouchStart(e, element);
      };
      element.addEventListener("touchstart", touchStartHandler);
      cleanupFunctions.push(() => element.removeEventListener("touchstart", touchStartHandler));
      const touchMoveHandler = (e) => {
        this.handleTouchMove(e, element);
      };
      element.addEventListener("touchmove", touchMoveHandler);
      cleanupFunctions.push(() => element.removeEventListener("touchmove", touchMoveHandler));
      const touchEndHandler = (e) => {
        this.handleTouchEnd(e, element);
      };
      element.addEventListener("touchend", touchEndHandler);
      cleanupFunctions.push(() => element.removeEventListener("touchend", touchEndHandler));
      const touchCancelHandler = (e) => {
        this.handleTouchEnd(e, element);
      };
      element.addEventListener("touchcancel", touchCancelHandler);
      cleanupFunctions.push(() => element.removeEventListener("touchcancel", touchCancelHandler));
      const keydownHandler = (e) => {
        this.handleKeydown(e, element);
      };
      element.addEventListener("keydown", keydownHandler);
      cleanupFunctions.push(() => element.removeEventListener("keydown", keydownHandler));
      this.instances.set(element, { cleanup: cleanupFunctions });
    },
    /**
     * Initialize a draggable container
     * @param {HTMLElement} container - Draggable container
     */
    initContainer: function(container) {
      container.setAttribute("role", "listbox");
      container.setAttribute("aria-label", container.getAttribute("aria-label") || "Draggable items");
      const items = container.querySelectorAll(".vd-draggable-item");
      items.forEach((item) => {
        if (!this.instances.has(item)) {
          this.initDraggable(item);
        }
      });
      const cleanupFunctions = [];
      const dragEnterHandler = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      };
      const dragOverHandler = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!this.currentDrag) return;
        const draggingEl = this.currentDrag.element;
        if (!container.contains(draggingEl)) return;
        if (e.clientX === 0 && e.clientY === 0) return;
        this.handleReorder(container, draggingEl, e.clientX, e.clientY);
      };
      const dropHandler = (e) => {
        e.preventDefault();
      };
      container.addEventListener("dragenter", dragEnterHandler);
      container.addEventListener("dragover", dragOverHandler);
      container.addEventListener("drop", dropHandler);
      cleanupFunctions.push(() => {
        container.removeEventListener("dragenter", dragEnterHandler);
        container.removeEventListener("dragover", dragOverHandler);
        container.removeEventListener("drop", dropHandler);
      });
      this.instances.set(container, { cleanup: cleanupFunctions });
    },
    /**
     * Initialize a drop zone
     * @param {HTMLElement} zone - Drop zone element
     */
    initDropZone: function(zone) {
      const cleanupFunctions = [];
      zone.setAttribute("role", "region");
      zone.setAttribute("aria-dropeffect", "move");
      if (!zone.hasAttribute("aria-label")) {
        zone.setAttribute("aria-label", "Drop zone");
      }
      const dragOverHandler = (e) => {
        e.preventDefault();
        this.handleDragOver(e, zone);
      };
      zone.addEventListener("dragover", dragOverHandler);
      cleanupFunctions.push(() => zone.removeEventListener("dragover", dragOverHandler));
      const dragEnterHandler = (e) => {
        e.preventDefault();
        this.handleDragEnter(e, zone);
      };
      zone.addEventListener("dragenter", dragEnterHandler);
      cleanupFunctions.push(() => zone.removeEventListener("dragenter", dragEnterHandler));
      const dragLeaveHandler = (e) => {
        this.handleDragLeave(e, zone);
      };
      zone.addEventListener("dragleave", dragLeaveHandler);
      cleanupFunctions.push(() => zone.removeEventListener("dragleave", dragLeaveHandler));
      const dropHandler = (e) => {
        e.preventDefault();
        this.handleDrop(e, zone);
      };
      zone.addEventListener("drop", dropHandler);
      cleanupFunctions.push(() => zone.removeEventListener("drop", dropHandler));
      this.instances.set(zone, { cleanup: cleanupFunctions });
    },
    /**
     * Create feedback element for drag operations
     */
    createFeedbackElement: function() {
      if (!this.feedbackElement) {
        const existing = document.querySelector(".vd-drag-feedback");
        if (existing) {
          this.feedbackElement = existing;
          return;
        }
        this.feedbackElement = document.createElement("div");
        this.feedbackElement.className = "vd-drag-feedback hidden";
        this.feedbackElement.setAttribute("role", "presentation");
        document.body.appendChild(this.feedbackElement);
      }
    },
    /**
     * Handle drag start event
     * @param {DragEvent} e - Drag event
     * @param {HTMLElement} element - Draggable element
     */
    handleDragStart: function(e, element) {
      element.classList.add("is-dragging");
      element.setAttribute("aria-grabbed", "true");
      this.currentDrag = {
        element,
        initialPosition: { x: e.clientX, y: e.clientY },
        initialBounds: element.getBoundingClientRect(),
        data: this.getData(element)
      };
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", this.currentDrag.data);
      element.dispatchEvent(new CustomEvent("draggable:start", {
        bubbles: true,
        detail: {
          element,
          data: this.currentDrag.data,
          position: { x: e.clientX, y: e.clientY }
        }
      }));
    },
    /**
     * Handle drag event
     * @param {DragEvent} e - Drag event
     * @param {HTMLElement} element - Draggable element
     */
    handleDrag: function(e, element) {
      if (!this.currentDrag) return;
      element.dispatchEvent(new CustomEvent("draggable:drag", {
        bubbles: true,
        detail: {
          element,
          data: this.currentDrag.data,
          position: { x: e.clientX, y: e.clientY },
          delta: {
            x: e.clientX - this.currentDrag.initialPosition.x,
            y: e.clientY - this.currentDrag.initialPosition.y
          }
        }
      }));
    },
    /**
     * Handle drag end event
     * @param {DragEvent} e - Drag event
     * @param {HTMLElement} element - Draggable element
     */
    handleDragEnd: function(e, element) {
      element.classList.remove("is-dragging");
      element.classList.add("is-dropped");
      setTimeout(() => element.classList.remove("is-dropped"), 300);
      element.setAttribute("aria-grabbed", "false");
      if (this.feedbackElement) {
        this.feedbackElement.classList.add("hidden");
      }
      const data = this.currentDrag?.data || this.getData(element);
      const initialPos = this.currentDrag?.initialPosition || { x: 0, y: 0 };
      element.dispatchEvent(new CustomEvent("draggable:end", {
        bubbles: true,
        detail: {
          element,
          data,
          position: { x: e.clientX, y: e.clientY },
          delta: {
            x: e.clientX - initialPos.x,
            y: e.clientY - initialPos.y
          }
        }
      }));
      this.currentDrag = null;
    },
    /**
     * Handle touch start event (for mobile)
     * @param {TouchEvent} e - Touch event
     * @param {HTMLElement} element - Draggable element
     */
    handleTouchStart: function(e, element) {
      const touch = e.touches[0];
      this.touchState = {
        element,
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        isDragging: false
      };
    },
    /**
     * Handle touch move event (for mobile)
     * @param {TouchEvent} e - Touch event
     * @param {HTMLElement} element - Draggable element
     */
    handleTouchMove: function(e, element) {
      if (!this.touchState) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.touchState.startX;
      const deltaY = touch.clientY - this.touchState.startY;
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        e.preventDefault();
        if (!this.touchState.isDragging) {
          this.touchState.isDragging = true;
          element.classList.add("is-dragging");
          element.setAttribute("aria-grabbed", "true");
          this.currentDrag = {
            element,
            initialPosition: { x: this.touchState.startX, y: this.touchState.startY },
            initialBounds: element.getBoundingClientRect(),
            data: this.getData(element)
          };
          element.dispatchEvent(new CustomEvent("draggable:start", {
            bubbles: true,
            detail: {
              element,
              data: this.currentDrag.data,
              position: { x: touch.clientX, y: touch.clientY }
            }
          }));
        }
        this.updateFeedback(touch.clientX, touch.clientY);
        if (this.currentDrag) {
          element.dispatchEvent(new CustomEvent("draggable:drag", {
            bubbles: true,
            detail: {
              element,
              data: this.currentDrag.data,
              position: { x: touch.clientX, y: touch.clientY },
              delta: { x: deltaX, y: deltaY }
            }
          }));
          const container = element.closest(".vd-draggable-container");
          if (container && container.contains(element)) {
            this.handleReorder(container, element, touch.clientX, touch.clientY);
          }
        }
      }
    },
    /**
     * Handle touch end event (for mobile)
     * @param {TouchEvent} e - Touch event
     * @param {HTMLElement} element - Draggable element
     */
    handleTouchEnd: function(e, element) {
      if (this.touchState && this.touchState.isDragging) {
        e.preventDefault();
        element.classList.remove("is-dragging");
        element.classList.add("is-dropped");
        element.setAttribute("aria-grabbed", "false");
        setTimeout(() => element.classList.remove("is-dropped"), 300);
        if (this.feedbackElement) {
          this.feedbackElement.classList.add("hidden");
        }
        const endTouch = e.changedTouches[0];
        const data = this.currentDrag?.data || this.getData(element);
        const startX = this.touchState?.startX || 0;
        const startY = this.touchState?.startY || 0;
        element.dispatchEvent(new CustomEvent("draggable:end", {
          bubbles: true,
          detail: {
            element,
            data,
            position: { x: endTouch.clientX, y: endTouch.clientY },
            delta: {
              x: endTouch.clientX - startX,
              y: endTouch.clientY - startY
            }
          }
        }));
      }
      this.touchState = null;
      this.currentDrag = null;
    },
    /**
     * Handle drag over event
     * @param {DragEvent} e - Drag event
     * @param {HTMLElement} _zone - Drop zone element
     */
    handleDragOver: function(e, _zone) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    },
    /**
     * Handle drag enter event
     * @param {DragEvent} e - Drag event
     * @param {HTMLElement} zone - Drop zone element
     */
    handleDragEnter: function(e, zone) {
      e.preventDefault();
      zone.classList.add("is-drag-over");
    },
    /**
     * Handle drag leave event
     * @param {DragEvent} e - Drag event
     * @param {HTMLElement} zone - Drop zone element
     */
    handleDragLeave: function(e, zone) {
      zone.classList.remove("is-drag-over");
    },
    /**
     * Handle drop event
     * @param {DragEvent} e - Drag event
     * @param {HTMLElement} zone - Drop zone element
     */
    handleDrop: function(e, zone) {
      e.preventDefault();
      zone.classList.remove("is-drag-over");
      zone.dispatchEvent(new CustomEvent("draggable:drop", {
        bubbles: true,
        detail: {
          zone,
          element: this.currentDrag?.element,
          data: this.currentDrag?.data,
          position: { x: e.clientX, y: e.clientY }
        }
      }));
    },
    /**
     * Reorder elements in container based on cursor position
     * @param {HTMLElement} container 
     * @param {HTMLElement} element 
     * @param {number} clientX 
     * @param {number} clientY 
     */
    handleReorder: function(container, element, clientX, clientY) {
      const isVertical = container.classList.contains("vd-draggable-container-vertical");
      const siblings = [...container.querySelectorAll(".vd-draggable-item:not(.is-dragging), .vd-draggable:not(.is-dragging)")];
      const nextSibling = siblings.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = isVertical ? clientY - box.top - box.height / 2 : clientX - box.left - box.width / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset, element: child };
        } else {
          return closest;
        }
      }, { offset: Number.NEGATIVE_INFINITY }).element;
      if (nextSibling == null) {
        container.appendChild(element);
      } else {
        container.insertBefore(element, nextSibling);
      }
    },
    /**
     * Handle keyboard events
     * @param {KeyboardEvent} e - Keyboard event
     * @param {HTMLElement} element - Draggable element
     */
    handleKeydown: function(e, element) {
      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          element.click();
          break;
        case "Escape":
          if (element.classList.contains("is-dragging")) {
            element.classList.remove("is-dragging");
            element.setAttribute("aria-grabbed", "false");
            if (this.feedbackElement) {
              this.feedbackElement.classList.add("hidden");
            }
            this.currentDrag = null;
          }
          break;
        case "ArrowUp":
        case "ArrowLeft": {
          e.preventDefault();
          const prev = element.previousElementSibling;
          if (prev && (prev.classList.contains("vd-draggable") || prev.classList.contains("vd-draggable-item"))) {
            element.parentNode.insertBefore(element, prev);
            element.focus();
            element.dispatchEvent(new CustomEvent("draggable:reorder", {
              bubbles: true,
              detail: { element, direction: "up" }
            }));
          }
          break;
        }
        case "ArrowDown":
        case "ArrowRight": {
          e.preventDefault();
          const next = element.nextElementSibling;
          if (next && (next.classList.contains("vd-draggable") || next.classList.contains("vd-draggable-item"))) {
            element.parentNode.insertBefore(next, element);
            element.focus();
            element.dispatchEvent(new CustomEvent("draggable:reorder", {
              bubbles: true,
              detail: { element, direction: "down" }
            }));
          }
          break;
        }
      }
    },
    /**
     * Get data from draggable element
     * @param {HTMLElement} element - Draggable element
     * @returns {string} Data associated with the element
     */
    getData: function(element) {
      return element.dataset.draggable || element.textContent.trim();
    },
    /**
     * Update drag feedback element
     * @param {number} x - Current X coordinate
     * @param {number} y - Current Y coordinate
     */
    updateFeedback: function(x, y) {
      if (!this.currentDrag) return;
      this.feedbackElement.classList.remove("hidden");
      const rect = this.currentDrag.initialBounds;
      this.feedbackElement.innerHTML = "";
      const clone = this.currentDrag.element.cloneNode(true);
      this.feedbackElement.appendChild(clone);
      Object.assign(this.feedbackElement.style, {
        left: x - 20 + "px",
        top: y - 20 + "px",
        width: rect.width + "px",
        height: rect.height + "px"
      });
    },
    /**
     * Make an element draggable programmatically
     * @param {HTMLElement|string} element - Element or selector
     * @param {Object} options - Configuration options
     */
    makeDraggable: function(element, options = {}) {
      const el = typeof element === "string" ? document.querySelector(element) : element;
      if (el && !this.instances.has(el)) {
        el.classList.add("vd-draggable");
        el.setAttribute("draggable", "true");
        if (options.data) {
          el.dataset.draggable = options.data;
        }
        this.initDraggable(el);
      }
    },
    /**
     * Remove draggable functionality from an element
     * @param {HTMLElement|string} element - Element or selector
     */
    removeDraggable: function(element) {
      const el = typeof element === "string" ? document.querySelector(element) : element;
      if (el && this.instances.has(el)) {
        const instance = this.instances.get(el);
        instance.cleanup.forEach((fn) => fn());
        this.instances.delete(el);
        el.classList.remove("vd-draggable");
        el.removeAttribute("draggable");
        el.removeAttribute("data-draggable");
      }
    },
    /**
     * Destroy a draggable instance and clean up event listeners
     * @param {HTMLElement} element - Draggable element
     */
    destroy: function(element) {
      this.removeDraggable(element);
    },
    /**
     * Destroy all draggable instances
     */
    destroyAll: function() {
      const instances = Array.from(this.instances.keys());
      instances.forEach((element) => this.destroy(element));
    }
  };
  if (typeof window.Vanduo !== "undefined") {
    window.Vanduo.register("draggable", Draggable);
  }
  window.VanduoDraggable = Draggable;
})();

// js/index.js
var Vanduo = window.Vanduo;
var index_default = Vanduo;
export {
  Vanduo,
  index_default as default
};
//# sourceMappingURL=vanduo.esm.js.map
