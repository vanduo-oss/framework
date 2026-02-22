/**
 * Vanduo Framework - Search Component
 * Client-side search functionality for content pages
 * 
 * @example Basic usage (initialize with defaults)
 * // HTML:
 * // <div class="doc-search">
 * //   <input type="search" class="doc-search-input" placeholder="Search...">
 * //   <div class="vd-doc-search-results"></div>
 * // </div>
 * 
 * @example Custom configuration
 * var search = Search.create({
 *   containerSelector: '.my-search',
 *   contentSelector: 'article[id]',
 *   titleSelector: 'h2, h3',
 *   maxResults: 5,
 *   onSelect: function(result) {
 *     console.log('Selected:', result.title);
 *   }
 * });
 * 
 * @example With custom data source
 * var search = Search.create({
 *   containerSelector: '.my-search',
 *   data: [
 *     { id: 'item1', title: 'First Item', content: 'Description...', category: 'Category A' },
 *     { id: 'item2', title: 'Second Item', content: 'Description...', category: 'Category B' }
 *   ]
 * });
 */

(function() {
  'use strict';

  /**
   * Default configuration
   */
  const DEFAULTS = {
    // Behavior
    minQueryLength: 2,
    maxResults: 10,
    debounceMs: 150,
    highlightTag: 'mark',
    keyboardShortcut: true,  // Enable Cmd/Ctrl+K shortcut
    
    // Selectors (for DOM-based indexing)
    containerSelector: '.vd-doc-search',
    inputSelector: '.vd-doc-search-input',
    resultsSelector: '.vd-doc-search-results',
    contentSelector: '.doc-content section[id]',
    titleSelector: '.demo-title, h2, h3',
    navSelector: '.doc-nav-link',
    sectionSelector: '.doc-nav-section',
    
    // Content extraction
    excludeFromContent: 'pre, code, script, style',
    maxContentLength: 500,
    
    // Custom data source (alternative to DOM indexing)
    data: null,
    
    // Category icons mapping
    categoryIcons: {
      'getting-started': 'ph-rocket-launch',
      'core': 'ph-cube',
      'components': 'ph-puzzle-piece',
      'interactive': 'ph-cursor-click',
      'data-display': 'ph-table',
      'feedback': 'ph-bell',
      'meta': 'ph-info',
      'default': 'ph-file-text'
    },
    
    // Callbacks
    onSelect: null,      // function(result) - called when result is selected
    onSearch: null,      // function(query, results) - called after search
    onOpen: null,        // function() - called when results open
    onClose: null,       // function() - called when results close
    
    // Text customization
    emptyTitle: 'No results found',
    emptyText: 'Try different keywords or check spelling',
    placeholder: 'Search...'
  };

  /**
   * Search Component Factory
   * Creates a new search instance with the given configuration
   * 
   * @param {Object} options - Configuration options
   * @returns {Object} Search instance
   */
  function createSearch(options) {
    const config = Object.assign({}, DEFAULTS, options || {});
    
    // Instance state
    const state = {
      initialized: false,
      index: [],
      results: [],
      activeIndex: -1,
      isOpen: false,
      query: '',
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
        console.warn('[Vanduo Search] Failed to render results:', error);
      }
    }

    /**
     * Initialize the search component
     * Idempotent — safe to call more than once on the same instance.
     * Returns the instance on success, null if required DOM elements are missing.
     */
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

      // Set placeholder if configured
      if (config.placeholder) {
        state.input.setAttribute('placeholder', config.placeholder);
      }

      // Build search index
      buildIndex();

      // Bind events
      bindEvents();

      // Set up ARIA attributes
      setupAria();

      state.initialized = true;
      return instance;
    }

    /**
     * Build search index from DOM or custom data
     */
    function buildIndex() {
      state.index = [];
      
      // Use custom data if provided
      if (config.data && Array.isArray(config.data)) {
        config.data.forEach(function(item) {
          state.index.push({
            id: item.id || slugify(item.title),
            title: item.title || '',
            category: item.category || '',
            categorySlug: slugify(item.category || ''),
            content: item.content || '',
            keywords: item.keywords || extractKeywordsFromText(item.title + ' ' + item.content),
            url: item.url || '#' + (item.id || slugify(item.title)),
            icon: item.icon || ''
          });
        });
        return;
      }

      // Build from DOM
      const sections = document.querySelectorAll(config.contentSelector);
      const categoryMap = buildCategoryMap();

      sections.forEach(function(section) {
        const id = section.id;
        if (!id) return;

        const titleEl = section.querySelector(config.titleSelector);
        const title = titleEl ? titleEl.textContent.replace(/v[\d.]+/g, '').trim() : id;
        const category = categoryMap[id] || 'Documentation';
        const content = extractContent(section);
        const keywords = extractKeywords(section, title);
        const iconEl = titleEl ? titleEl.querySelector('i.ph') : null;
        let icon = '';
        if (iconEl && iconEl.classList) {
          for (let ci = 0; ci < iconEl.classList.length; ci++) {
            if (iconEl.classList[ci].indexOf('ph-') === 0) {
              icon = iconEl.classList[ci];
              break;
            }
          }
        }

        state.index.push({
          id: id,
          title: title,
          category: category,
          categorySlug: slugify(category),
          content: content,
          keywords: keywords,
          url: '#' + id,
          icon: icon
        });
      });
    }

    /**
     * Build a map of section IDs to their categories
     */
    function buildCategoryMap() {
      const map = {};
      let currentCategory = 'Documentation';
      const navItems = document.querySelectorAll(config.navSelector + ', ' + config.sectionSelector);

      navItems.forEach(function(item) {
        if (item.classList.contains('doc-nav-section')) {
          currentCategory = item.textContent.trim();
        } else {
          const href = item.getAttribute('href');
          if (href && href.startsWith('#')) {
            const id = href.substring(1);
            map[id] = currentCategory;
          }
        }
      });

      return map;
    }

    /**
     * Extract searchable content from a section
     */
    function extractContent(section) {
      const clone = section.cloneNode(true);
      
      const toRemove = clone.querySelectorAll(config.excludeFromContent);
      toRemove.forEach(function(el) {
        el.remove();
      });

      let text = clone.textContent || '';
      text = text.replace(/\s+/g, ' ').trim();
      
      return text.substring(0, config.maxContentLength);
    }

    /**
     * Extract keywords from a section
     */
    function extractKeywords(section, title) {
      const keywords = [];
      
      // Add title words
      title.toLowerCase().split(/\s+/).forEach(function(word) {
        if (word.length > 2) {
          keywords.push(word);
        }
      });

      // Add class names from code examples
      const codeBlocks = section.querySelectorAll('code');
      codeBlocks.forEach(function(code) {
        const text = code.textContent || '';
        const classMatches = text.match(/\.([\w-]+)/g);
        if (classMatches) {
          classMatches.forEach(function(match) {
            keywords.push(match.substring(1).toLowerCase());
          });
        }
      });

      // Add data attributes
      const dataAttrs = section.querySelectorAll('[data-tooltip], [data-modal]');
      dataAttrs.forEach(function(el) {
        const attrs = el.getAttributeNames().filter(function(name) {
          return name.startsWith('data-');
        });
        attrs.forEach(function(attr) {
          keywords.push(attr.replace('data-', ''));
        });
      });

      return Array.from(new Set(keywords));
    }

    /**
     * Extract keywords from text string
     */
    function extractKeywordsFromText(text) {
      const words = text.toLowerCase().split(/\s+/);
      return words.filter(function(word) {
        return word.length > 2;
      });
    }

    /**
     * Convert string to slug
     */
    function slugify(str) {
      return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }

    /**
     * Bind event listeners
     */
    function bindEvents() {
      // Store bound handlers for cleanup
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
        if (config.keyboardShortcut && (e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          state.input.focus();
          state.input.select();
        }
      };
      state.boundHandlers.handleResultClick = function(e) {
        const result = e.target.closest('.vd-doc-search-result');
        if (result) {
          const index = parseInt(result.dataset.index, 10);
          select(index);
        }
      };

      // Input events
      state.input.addEventListener('input', state.boundHandlers.handleInput);
      state.input.addEventListener('focus', state.boundHandlers.handleFocus);
      state.input.addEventListener('keydown', state.boundHandlers.handleKeydown);

      // Close on outside click
      document.addEventListener('click', state.boundHandlers.handleOutsideClick);

      // Global keyboard shortcut
      document.addEventListener('keydown', state.boundHandlers.handleGlobalKeydown);

      // Result click handling
      state.resultsContainer.addEventListener('click', state.boundHandlers.handleResultClick);
    }

    /**
     * Unbind event listeners
     */
    function unbindEvents() {
      if (state.input) {
        state.input.removeEventListener('input', state.boundHandlers.handleInput);
        state.input.removeEventListener('focus', state.boundHandlers.handleFocus);
        state.input.removeEventListener('keydown', state.boundHandlers.handleKeydown);
      }
      document.removeEventListener('click', state.boundHandlers.handleOutsideClick);
      document.removeEventListener('keydown', state.boundHandlers.handleGlobalKeydown);
      if (state.resultsContainer) {
        state.resultsContainer.removeEventListener('click', state.boundHandlers.handleResultClick);
      }
    }

    /**
     * Set up ARIA attributes
     */
    function setupAria() {
      const resultsId = state.resultsContainer.id || 'search-results-' + Math.random().toString(36).substr(2, 9);
      state.resultsContainer.id = resultsId;
      
      state.input.setAttribute('role', 'combobox');
      state.input.setAttribute('aria-autocomplete', 'list');
      state.input.setAttribute('aria-controls', resultsId);
      state.input.setAttribute('aria-expanded', 'false');
      
      state.resultsContainer.setAttribute('role', 'listbox');
      state.resultsContainer.setAttribute('aria-label', 'Search results');
    }

    /**
     * Handle input changes
     */
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

        // Callback
        if (typeof config.onSearch === 'function') {
          safeInvokeCallback('onSearch', config.onSearch, query, state.results);
        }
      }, config.debounceMs);
    }

    /**
     * Handle keyboard navigation
     */
    function handleKeydown(e) {
      if (!state.isOpen) {
        if (e.key === 'ArrowDown' && state.query.length >= config.minQueryLength) {
          e.preventDefault();
          state.results = search(state.query);
          render();
          open();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          navigate(1);
          break;

        case 'ArrowUp':
          e.preventDefault();
          navigate(-1);
          break;

        case 'Enter':
          e.preventDefault();
          if (state.activeIndex >= 0) {
            select(state.activeIndex);
          } else if (state.results.length > 0) {
            select(0);
          }
          break;

        case 'Escape':
          e.preventDefault();
          close();
          break;

        case 'Tab':
          close();
          break;
      }
    }

    /**
     * Perform search
     */
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
          // Title match - highest priority
          if (titleLower.includes(term)) {
            score += 100;
            if (titleLower === term) {
              score += 50;
            } else if (titleLower.startsWith(term)) {
              score += 25;
            }
          }

          // Category match
          if (categoryLower.includes(term)) {
            score += 50;
          }

          // Keyword match
          const keywordMatch = entry.keywords.some(function(k) {
            return k.includes(term);
          });
          if (keywordMatch) {
            score += 30;
          }

          // Content match
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
            score: score
          });
        }
      });

      scored.sort(function(a, b) {
        return b.score - a.score;
      });

      return scored.slice(0, config.maxResults);
    }

    /**
     * Render search results
     */
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

        html += '<li class="vd-doc-search-result' + (isActive ? ' is-active' : '') + '"' +
          ' role="option"' +
          ' id="vd-doc-search-result-' + index + '"' +
          ' data-index="' + index + '"' +
          ' data-category="' + escapeHtml(result.categorySlug) + '"' +
          ' aria-selected="' + isActive + '"' +
          '>' +
          '<div class="vd-doc-search-result-icon">' +
          '<i class="ph ' + escapeHtml(icon) + '"></i>' +
          '</div>' +
          '<div class="vd-doc-search-result-content">' +
          '<div class="vd-doc-search-result-title">' + highlight(result.title, state.query) + '</div>' +
          '<div class="vd-doc-search-result-category">' + escapeHtml(result.category) + '</div>' +
          '<div class="vd-doc-search-result-excerpt">' + highlight(excerpt, state.query) + '</div>' +
          '</div>' +
          '</li>';
      });

      html += '</ul>';
      html += renderFooter();

      setResultsHtml(html);
    }

    /**
     * Render empty state
     */
    function renderEmpty() {
      return '<div class="vd-doc-search-empty">' +
        '<div class="vd-doc-search-empty-icon"><i class="ph ph-magnifying-glass"></i></div>' +
        '<div class="vd-doc-search-empty-title">' + escapeHtml(config.emptyTitle) + '</div>' +
        '<div class="vd-doc-search-empty-text">' + escapeHtml(config.emptyText) + '</div>' +
        '</div>';
    }

    /**
     * Render footer with keyboard hints
     */
    function renderFooter() {
      return '<div class="vd-doc-search-footer">' +
        '<span class="vd-doc-search-footer-item"><kbd>↑</kbd><kbd>↓</kbd> to navigate</span>' +
        '<span class="vd-doc-search-footer-item"><kbd>↵</kbd> to select</span>' +
        '<span class="vd-doc-search-footer-item"><kbd>esc</kbd> to close</span>' +
        '</div>';
    }

    /**
     * Get icon for category
     */
    function getCategoryIcon(categorySlug) {
      return config.categoryIcons[categorySlug] || config.categoryIcons['default'] || 'ph-file-text';
    }

    /**
     * Get excerpt from content
     */
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
        return content.substring(0, excerptLength) + '...';
      }

      const start = Math.max(0, matchPos - 30);
      const end = Math.min(content.length, matchPos + excerptLength);
      let excerpt = content.substring(start, end);

      if (start > 0) {
        excerpt = '...' + excerpt;
      }
      if (end < content.length) {
        excerpt = excerpt + '...';
      }

      return excerpt;
    }

    /**
     * Highlight matched terms in text
     */
    function highlight(text, query) {
      if (!query) return escapeHtml(text);

      const terms = query.toLowerCase().split(/\s+/).filter(function(t) {
        return t.length > 0;
      });
      let escaped = escapeHtml(text);

      terms.forEach(function(term) {
        // Skip overly long terms to prevent ReDoS
        if (term.length > 50) return;
        const regex = new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        escaped = escaped.replace(regex, '<' + config.highlightTag + '>$1</' + config.highlightTag + '>');
      });

      return escaped;
    }

    /**
     * Escape HTML entities
     */
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    /**
     * Navigate results with keyboard
     */
    function navigate(direction) {
      let newIndex = state.activeIndex + direction;

      if (newIndex < 0) {
        newIndex = state.results.length - 1;
      } else if (newIndex >= state.results.length) {
        newIndex = 0;
      }

      setActiveIndex(newIndex);
    }

    /**
     * Set active result index
     */
    function setActiveIndex(index) {
      const prevActive = state.resultsContainer.querySelector('.vd-doc-search-result.is-active');
      if (prevActive) {
        prevActive.classList.remove('is-active');
        prevActive.setAttribute('aria-selected', 'false');
      }

      state.activeIndex = index;

      const newActive = state.resultsContainer.querySelector('[data-index="' + index + '"]');
      if (newActive) {
        newActive.classList.add('is-active');
        newActive.setAttribute('aria-selected', 'true');
        state.input.setAttribute('aria-activedescendant', 'vd-doc-search-result-' + index);
        newActive.scrollIntoView({ block: 'nearest' });
      }
    }

    /**
     * Select a result
     */
    function select(index) {
      const result = state.results[index];
      if (!result) return;

      // Close search
      close();
      state.input.value = '';
      state.query = '';

      // Custom callback
      if (typeof config.onSelect === 'function') {
        safeInvokeCallback('onSelect', config.onSelect, result);
        return;
      }

      // Default behavior: navigate to section
      const section = document.querySelector(result.url);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.pushState(null, '', result.url);
        updateSidebarActive(result.id);
      }
    }

    /**
     * Update sidebar navigation active state
     */
    function updateSidebarActive(sectionId) {
      const navLinks = document.querySelectorAll(config.navSelector);
      navLinks.forEach(function(link) {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + sectionId) {
          link.classList.add('active');
        }
      });
    }

    /**
     * Open results dropdown
     */
    function open() {
      if (state.isOpen) return;

      state.isOpen = true;
      state.resultsContainer.classList.add('is-open');
      state.input.setAttribute('aria-expanded', 'true');

      if (typeof config.onOpen === 'function') {
        safeInvokeCallback('onOpen', config.onOpen);
      }
    }

    /**
     * Close results dropdown
     */
    function close() {
      if (!state.isOpen) return;

      state.isOpen = false;
      state.activeIndex = -1;
      state.resultsContainer.classList.remove('is-open');
      state.input.setAttribute('aria-expanded', 'false');
      state.input.removeAttribute('aria-activedescendant');

      if (typeof config.onClose === 'function') {
        safeInvokeCallback('onClose', config.onClose);
      }
    }

    /**
     * Destroy the component
     */
    function destroy() {
      unbindEvents();
      
      state.initialized = false;
      state.index = [];
      state.results = [];
      state.isOpen = false;
      state.query = '';

      if (state.debounceTimer) {
        clearTimeout(state.debounceTimer);
      }

      if (state.resultsContainer) {
        setResultsHtml('');
      }
    }

    /**
     * Rebuild the search index
     */
    function rebuild() {
      buildIndex();
    }

    /**
     * Update configuration
     */
    function setConfig(newConfig) {
      Object.assign(config, newConfig);
    }

    /**
     * Get current configuration
     */
    function getConfig() {
      return Object.assign({}, config);
    }

    /**
     * Get search index
     */
    function getIndex() {
      return state.index.slice();
    }

    // Public instance API
    const instance = {
      init: init,
      destroy: destroy,
      rebuild: rebuild,
      search: search,
      open: open,
      close: close,
      setConfig: setConfig,
      getConfig: getConfig,
      getIndex: getIndex
    };

    return instance;
  }

  /**
   * Search Component (singleton for backward compatibility)
   */
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

  // Register with Vanduo framework if available
  if (typeof window.Vanduo !== 'undefined') {
    window.Vanduo.register('docSearch', Search);
  }

  // Expose globally (both names for compatibility)
  window.Search = Search;
  window.DocSearch = Search;  // Backward compatibility
  window.VanduoDocSearch = Search;  // New name compatibility

})();
