#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const packagePath = path.join(rootDir, 'package.json');
const buildInfoPath = path.join(distDir, 'build-info.json');

const bannerFiles = [
    'vanduo.css',
    'vanduo.min.css',
    'vanduo.js',
    'vanduo.min.js',
    'vanduo.esm.js',
    'vanduo.esm.min.js',
    'vanduo.cjs.js',
    'vanduo.cjs.min.js'
];

const jsFiles = [
    'vanduo.js',
    'vanduo.min.js',
    'vanduo.esm.js',
    'vanduo.esm.min.js',
    'vanduo.cjs.js',
    'vanduo.cjs.min.js'
];

const errors = [];

function fail(message) {
    errors.push(message);
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readJsonFile(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

if (!fs.existsSync(packagePath)) {
    fail('package.json not found.');
}

if (!fs.existsSync(distDir)) {
    fail('dist/ directory not found. Run `pnpm run build` first.');
}

let packageVersion = null;
if (errors.length === 0) {
    const pkg = readJsonFile(packagePath);
    packageVersion = pkg.version;

    if (!packageVersion) {
        fail('`version` is missing in package.json.');
    }
}

if (packageVersion && fs.existsSync(buildInfoPath)) {
    const buildInfo = readJsonFile(buildInfoPath);
    if (buildInfo.version !== packageVersion) {
        fail(`build-info.json version mismatch: expected ${packageVersion}, found ${buildInfo.version}`);
    }
} else if (packageVersion) {
    fail('dist/build-info.json is missing.');
}

if (packageVersion) {
    for (const fileName of bannerFiles) {
        const filePath = path.join(distDir, fileName);

        if (!fs.existsSync(filePath)) {
            fail(`Missing dist file for banner check: ${fileName}`);
            continue;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const firstLine = content.split('\n', 1)[0] || '';

        if (!firstLine.includes(`Vanduo v${packageVersion}`)) {
            fail(`Banner version mismatch in ${fileName}: expected Vanduo v${packageVersion}`);
        }
    }

    const directVersionPattern = new RegExp(`version\\s*:\\s*["']${escapeRegExp(packageVersion)}["']`);
    const injectedVersionPattern = new RegExp(`VANDUO_VERSION[^\\n]*["']${escapeRegExp(packageVersion)}["']`);
    const injectedReferencePattern = /version\s*:\s*VANDUO_VERSION/;

    for (const fileName of jsFiles) {
        const filePath = path.join(distDir, fileName);

        if (!fs.existsSync(filePath)) {
            fail(`Missing dist JS file for runtime check: ${fileName}`);
            continue;
        }

        const content = fs.readFileSync(filePath, 'utf8');

        const hasDirectVersion = directVersionPattern.test(content);
        const hasInjectedVersion = injectedVersionPattern.test(content) && injectedReferencePattern.test(content);

        if (!hasDirectVersion && !hasInjectedVersion) {
            fail(`Runtime version mismatch in ${fileName}: missing version:${packageVersion}`);
        }

        if (!content.includes('Vanduo Framework v') || !content.includes(' initialized')) {
            fail(`Runtime init log marker missing in ${fileName}`);
        }

        const hardcodedMatches = [...content.matchAll(/Vanduo Framework v(\d+\.\d+\.\d+) initialized/g)];
        for (const match of hardcodedMatches) {
            if (match[1] !== packageVersion) {
                fail(`Hardcoded runtime log version mismatch in ${fileName}: found ${match[1]}, expected ${packageVersion}`);
            }
        }
    }
}

if (errors.length > 0) {
    console.error('❌ Version consistency check failed:');
    errors.forEach((message) => console.error(` - ${message}`));
    process.exit(1);
}

console.log(`✅ Version consistency check passed for v${packageVersion}`);
