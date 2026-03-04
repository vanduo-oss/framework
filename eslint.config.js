import js from '@eslint/js';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',  // These are not ES modules
            globals: {
                // Browser globals
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                requestAnimationFrame: 'readonly',
                cancelAnimationFrame: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
                navigator: 'readonly',
                location: 'readonly',
                performance: 'readonly',
                getComputedStyle: 'readonly',
                MutationObserver: 'readonly',
                ResizeObserver: 'readonly',
                IntersectionObserver: 'readonly',
                HTMLElement: 'readonly',
                Element: 'readonly',
                Node: 'readonly',
                Event: 'readonly',
                CustomEvent: 'readonly',
                KeyboardEvent: 'readonly',
                MouseEvent: 'readonly',
                DOMParser: 'readonly',
                URL: 'readonly',
                CSS: 'readonly',

                // CommonJS globals for UMD compatibility
                module: 'readonly',
                exports: 'readonly',
                define: 'readonly',

                // Vanduo framework globals
                Vanduo: 'writable',
                __VANDUO_VERSION__: 'readonly',
                ready: 'readonly',
                debounce: 'readonly',
                escapeHtml: 'readonly',
                sanitizeHtml: 'readonly'
            }
        },
        rules: {
            // Enforce modern declarations
            'no-var': 'error',
            'prefer-const': 'error',

            // Require strict mode, allowing either global or function form
            strict: ['error', 'safe'],

            // Safer equality while allowing common null checks
            eqeqeq: ['error', 'smart'],

            // Warn on unused vars but don't error
            'no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_'
            }],

            // Allow console for debugging
            'no-console': 'off',

            // Allow empty functions
            'no-empty-function': 'off',
            'no-empty': ['error', { allowEmptyCatch: true }],

            // Allow var redeclaration (legacy code)
            'no-redeclare': 'warn',

            // Allow useless escapes (legacy regex)
            'no-useless-escape': 'warn'
        }
    },
    {
        // Override for ES module entry point
        files: ['js/index.js'],
        languageOptions: {
            sourceType: 'module'
        },
        rules: {
            // ESM is always strict; no directive required
            strict: 'off'
        }
    },
    {
        // Override for helpers.js - these are global utility definitions
        files: ['js/utils/helpers.js'],
        rules: {
            'no-redeclare': 'off',
            'no-unused-vars': 'off',  // These are intentionally global utilities
            // Helpers are top-level globals; strict is enforced by file directive.
            strict: 'off'
        }
    },
    {
        // Ignore dist folder and vendor files
        ignores: ['dist/**', 'phosphor-icons/**', 'devUtils/**', 'scripts/**']
    }
];
