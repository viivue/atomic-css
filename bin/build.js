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

// Both --config and --output are required.
// If called with no args at all (e.g. checking the binary exists), exit silently.
// If only one arg is missing, tell the user which one.
if (!configArg || !outputArg) {
    if (args.length === 0) process.exit(0);
    if (!configArg) console.warn('\n  [atomic-css] Missing required argument: --config <path/to/_config.scss>\n');
    if (!outputArg) console.warn('\n  [atomic-css] Missing required argument: --output <path/to/output/>\n');
    process.exit(0);
}

const configPath = path.resolve(process.cwd(), configArg);
const outputDir  = path.resolve(process.cwd(), outputArg);

if (!fs.existsSync(configPath)) {
    console.error(`[atomic-css] Config not found: ${configPath}`);
    process.exit(1);
}

// Check if the config file has "@forward "defs"" — it must be there.
// That line loads the default variable definitions this package relies on.
const configContent = fs.readFileSync(configPath, 'utf8');
if (!/^\s*@forward\s+["']defs["']/m.test(configContent)) {
    console.error('');
    console.error('  [atomic-css] Missing required line in your config file:');
    console.error('');
    console.error('    @forward "defs";');
    console.error('');
    console.error('  Add it at the top of: ' + configArg);
    console.error('');
    process.exit(1);
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
    return (content.match(/@use\s+["']([^"']+)["']/g) || [])
        .map(m => m.match(/@use\s+["']([^"']+)["']/)[1]);
}

// Extract a short module name from a sass error/warning URL for readable logs
function moduleFromUrl(url) {
    if (!url) return 'unknown';
    const file = url.pathname || url.toString();
    return path.basename(file, '.scss').replace(/^_/, '');
}

// ── Build ─────────────────────────────────────────────────────────────────────

// backup is declared outside try so finally can always check it safely.
// If it stays null, the config was never swapped and nothing needs restoring.
let backup = null;

try {
    // Verify package integrity before doing anything
    if (!fs.existsSync(configDest)) {
        console.error(`[atomic-css] Package file missing: ${configDest}`);
        console.error('  Try reinstalling @viivue/atomic-css.');
        process.exit(1);
    }
    if (!fs.existsSync(buildEntry)) {
        console.error(`[atomic-css] Package file missing: ${buildEntry}`);
        console.error('  Try reinstalling @viivue/atomic-css.');
        process.exit(1);
    }

    backup = fs.readFileSync(configDest, 'utf8');
    const modules = getModules(buildEntry);

    // Create the output folder if it doesn't exist yet
    fs.mkdirSync(outputDir, { recursive: true });

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
    // span.start.line is 0-based per the Sass JS API spec, so add 1 for display
    const line = err.span?.start?.line != null ? `:${err.span.start.line + 1}` : '';
    console.error('');
    console.error(`  ERR [${mod}${line}] ${err.sassMessage || err.message}`);
    process.exit(1);

} finally {
    // Always restore the original _config.scss, even if the build failed.
    // Only runs if backup was successfully read (i.e. the config was actually swapped).
    if (backup !== null) {
        fs.writeFileSync(configDest, backup);
    }
}
