#!/usr/bin/env node

'use strict';

const path = require('path');
const fs   = require('fs');
const sass = require('sass');
const csso = require('csso');

// ── Arg parsing ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

function getArg(name) {
    const i = args.indexOf(name);
    return i !== -1 && args[i + 1] ? args[i + 1] : null;
}

const configArg = getArg('--config');
const outputArg = getArg('--output');

if (!configArg || !outputArg) process.exit(0);

const configPath = path.resolve(process.cwd(), configArg);
const outputDir  = path.resolve(process.cwd(), outputArg);

if (!fs.existsSync(configPath)) {
    console.error(`[atomic-css] Config not found: ${configPath}`);
    process.exit(1);
}

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// ── Paths inside this package ────────────────────────────────────────────────
const pkgDir     = path.join(__dirname, '..');
const configDest = path.join(pkgDir, 'scss', '_config.scss');
const buildEntry = path.join(pkgDir, 'scss', '_build.scss');

// ── Helpers ──────────────────────────────────────────────────────────────────
function getModules(buildFile) {
    const content = fs.readFileSync(buildFile, 'utf8');
    return (content.match(/@use\s+"([^"]+)"/g) || [])
        .map(m => m.match(/@use\s+"([^"]+)"/)[1]);
}

function moduleFromUrl(url) {
    if (!url) return 'unknown';
    const file = url.pathname || url.toString();
    return path.basename(file, '.scss').replace(/^_/, '');
}

// ── Build ────────────────────────────────────────────────────────────────────
const backup  = fs.readFileSync(configDest, 'utf8');
const modules = getModules(buildEntry);

try {
    fs.copyFileSync(configPath, configDest);

    const warnings = [];

    const { css } = sass.compile(buildEntry, {
        sourceMap: false,
        loadPaths: [path.join(process.cwd(), 'node_modules')],
        logger: {
            warn(message, { span }) {
                const mod = span?.url ? moduleFromUrl(span.url) : 'unknown';
                warnings.push(`  WARN [${mod}] ${message}`);
            },
            debug() {},
        },
    });

    modules.forEach(m => console.log(`  OK  ${m}`));

    if (warnings.length) {
        console.log('');
        warnings.forEach(w => console.warn(w));
    }

    const { css: minified } = csso.minify(css);

    fs.writeFileSync(path.join(outputDir, 'atomic.css'),     css);
    fs.writeFileSync(path.join(outputDir, 'atomic.min.css'), minified);
} catch (err) {
    const mod  = err.span?.url ? moduleFromUrl(err.span.url) : 'unknown';
    const line = err.span?.start ? `:${err.span.start.line}` : '';
    console.error('');
    console.error(`  ERR [${mod}${line}] ${err.sassMessage || err.message}`);
    process.exit(1);
} finally {
    fs.writeFileSync(configDest, backup);
}
