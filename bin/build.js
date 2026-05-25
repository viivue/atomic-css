#!/usr/bin/env node

/**
 * @viivue/atomic-css — build script
 *
 * How it works:
 *   1. Takes your project's config file (--config) and temporarily copies it
 *      into this package's scss/ folder, replacing the default _config.scss.
 *   2. Compiles _build.scss (which picks up your config automatically).
 *   3. Writes atomic.css and atomic.min.css to your output folder (--output).
 *   4. Restores the original _config.scss no matter what (even on error).
 *
 * Usage (in your project's package.json scripts):
 *   node node_modules/@viivue/atomic-css/bin/build.js \
 *     --config path/to/your/_config.scss \
 *     --output path/to/your/output/folder
 */

'use strict';

const path = require('path');
const fs   = require('fs');
const sass = require('sass');
const csso = require('csso');

// ── Read CLI arguments ────────────────────────────────────────────────────────
const args = process.argv.slice(2);

function getArg(name) {
    const i = args.indexOf(name);
    return i !== -1 && args[i + 1] ? args[i + 1] : null;
}

const configArg = getArg('--config');
const outputArg = getArg('--output');

// Both --config and --output are required. Exit quietly if either is missing.
if (!configArg || !outputArg) process.exit(0);

const configPath = path.resolve(process.cwd(), configArg);
const outputDir  = path.resolve(process.cwd(), outputArg);

if (!fs.existsSync(configPath)) {
    console.error(`[atomic-css] Config not found: ${configPath}`);
    process.exit(1);
}

// Create the output folder if it doesn't exist yet
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// ── Paths inside this package ─────────────────────────────────────────────────
// __dirname is the bin/ folder of this package (inside node_modules)
const pkgDir     = path.join(__dirname, '..');
const configDest = path.join(pkgDir, 'scss', '_config.scss'); // will be overwritten temporarily
const buildEntry = path.join(pkgDir, 'scss', '_build.scss');  // main sass entry point

// ── Helpers ───────────────────────────────────────────────────────────────────

// Read _build.scss and return the list of module names it imports
function getModules(buildFile) {
    const content = fs.readFileSync(buildFile, 'utf8');
    return (content.match(/@use\s+"([^"]+)"/g) || [])
        .map(m => m.match(/@use\s+"([^"]+)"/)[1]);
}

// Extract a short module name from a sass error/warning URL for readable logs
function moduleFromUrl(url) {
    if (!url) return 'unknown';
    const file = url.pathname || url.toString();
    return path.basename(file, '.scss').replace(/^_/, '');
}

// ── Build ─────────────────────────────────────────────────────────────────────

// Back up the original _config.scss so we can restore it after the build
const backup  = fs.readFileSync(configDest, 'utf8');
const modules = getModules(buildEntry);

try {
    // Swap in the user's config — this is how the build picks up custom values
    fs.copyFileSync(configPath, configDest);

    const warnings = [];

    const { css } = sass.compile(buildEntry, {
        sourceMap: false,
        // Allow sass to resolve package imports (e.g. @use "@viivue/atomic-css/...")
        // from the project's node_modules folder
        loadPaths: [path.join(process.cwd(), 'node_modules')],
        logger: {
            warn(message, { span }) {
                const mod = span?.url ? moduleFromUrl(span.url) : 'unknown';
                warnings.push(`  WARN [${mod}] ${message}`);
            },
            debug() {},
        },
    });

    // Print each compiled module so the user knows what ran
    modules.forEach(m => console.log(`  OK  ${m}`));

    if (warnings.length) {
        console.log('');
        warnings.forEach(w => console.warn(w));
    }

    // Minify and write both the readable and minified versions
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
    // Always restore the original _config.scss, even if the build failed
    fs.writeFileSync(configDest, backup);
}
