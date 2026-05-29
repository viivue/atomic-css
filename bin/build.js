#!/usr/bin/env node

/**
 * @viivue/atomic-css — build script
 *
 * How it works:
 *   1. Copies this package's scss/ folder to a unique temp directory.
 *   2. Overwrites _config.scss in that temp directory with your project's config.
 *   3. Compiles from the temp directory — node_modules is never modified.
 *   4. Writes atomic.css and atomic.min.css to your output folder (--output).
 *   5. Cleans up the temp directory in the finally block.
 *
 * Usage (in your project's package.json scripts):
 *   node node_modules/@viivue/atomic-css/bin/build.js \
 *     --config path/to/your/_config.scss \
 *     --output path/to/your/output/folder
 */

'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');
const sass = require('sass');
const csso = require('csso');

// ── Read CLI arguments ────────────────────────────────────────────────────────
const args = process.argv.slice(2);

function getArg(name){
    const i = args.indexOf(name);
    const val = i !== -1 ? args[i + 1] : undefined;
    // Reject if the "value" is itself a flag (e.g. --config --output ./out)
    return val && !val.startsWith('--') ? val : null;
}

const configArg = getArg('--config');
const outputArg = getArg('--output');

// Both --config and --output are required.
// If called with no args at all (e.g. checking the binary exists), exit silently.
// If only one arg is missing, tell the user which one and exit with code 1
// so npm scripts and CI pipelines correctly detect the failure.
if(!configArg || !outputArg){
    if(args.length === 0) process.exit(0);
    if(!configArg) console.error('\n  [atomic-css] Missing required argument: --config <path/to/_config.scss>\n');
    if(!outputArg) console.error('\n  [atomic-css] Missing required argument: --output <path/to/output/>\n');
    process.exit(1);
}

const configPath = path.resolve(process.cwd(), configArg);
const outputDir = path.resolve(process.cwd(), outputArg);

if(!fs.existsSync(configPath)){
    console.error(`[atomic-css] Config not found: ${configPath}`);
    process.exit(1);
}

// ── Paths inside this package ─────────────────────────────────────────────────
// __dirname is the bin/ folder of this package (inside node_modules)
const pkgDir = path.join(__dirname, '..');
const configDest = path.join(pkgDir, 'scss', '_config.scss'); // checked for package integrity only
const buildEntry = path.join(pkgDir, 'scss', '_build.scss');  // main sass entry point

// ── Helpers ───────────────────────────────────────────────────────────────────

// Read _build.scss and return the list of module names it imports
function getModules(buildFile){
    const content = fs.readFileSync(buildFile, 'utf8');
    return [...content.matchAll(/@use\s+["']([^"']+)["']/g)].map(m => m[1]);
}

// Extract a short module name from a sass error/warning URL for readable logs
function moduleFromUrl(url){
    if(!url) return 'unknown';
    const file = url.pathname || url.toString();
    return path.basename(file, '.scss').replace(/^_/, '');
}

// ── Build ─────────────────────────────────────────────────────────────────────

// tempDir is declared outside try so finally can always clean it up.
let tempDir = null;

// buildFailed is set in catch so we can call process.exit(1) AFTER finally
// has cleaned up the temp directory.
// Never call process.exit() inside catch — it skips the finally block entirely.
let buildFailed = false;

try{
    // Verify package integrity before doing anything
    if(!fs.existsSync(configDest) || !fs.existsSync(buildEntry)){
        console.error(`[atomic-css] Package files missing in: ${path.join(pkgDir, 'scss')}`);
        console.error('  Try reinstalling @viivue/atomic-css.');
        process.exit(1);
    }

    // Copy the entire scss/ folder to a unique temp directory so node_modules
    // is never modified — safe for read-only environments and concurrent builds.
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atomic-css-'));
    fs.cpSync(path.join(pkgDir, 'scss'), tempDir, {recursive: true});

    // Overwrite _config.scss in the temp directory with the user's config
    fs.copyFileSync(configPath, path.join(tempDir, '_config.scss'));

    const tempBuildEntry = path.join(tempDir, '_build.scss');
    const modules = getModules(tempBuildEntry);

    // Create the output folder if it doesn't exist yet
    fs.mkdirSync(outputDir, {recursive: true});

    const warnings = [];

    const {css} = sass.compile(tempBuildEntry, {
        sourceMap: false,
        // Allow sass to resolve package imports (e.g. @use "@viivue/atomic-css/...")
        // from the project's node_modules folder
        loadPaths: [path.join(process.cwd(), 'node_modules')],
        logger: {
            warn(message, {span}){
                const mod = span?.url ? moduleFromUrl(span.url) : 'unknown';
                warnings.push(`  WARN [${mod}] ${message}`);
            },
            debug(){
            },
        },
    });

    // Print each compiled module so the user knows what ran
    modules.forEach(m => console.log(`  OK  ${m}`));

    if(warnings.length){
        console.log('');
        warnings.forEach(w => console.warn(w));
    }

    // Minify and write both the readable and minified versions
    const {css: minified} = csso.minify(css);

    const cssOutPath = path.join(outputDir, 'atomic.css');
    const minOutPath = path.join(outputDir, 'atomic.min.css');
    fs.writeFileSync(cssOutPath, css);
    fs.writeFileSync(minOutPath, minified);

    function formatBytes(n){
        return n >= 1024 ? (n / 1024).toFixed(1) + ' kB' : n + ' B';
    }

    const cssSize = formatBytes(Buffer.byteLength(css));
    const minSize = formatBytes(Buffer.byteLength(minified));
    console.log('');
    console.log(`  ✓  atomic.css     ${cssSize.padStart(8)}  →  ${outputDir}`);
    console.log(`  ✓  atomic.min.css ${minSize.padStart(8)}  →  ${outputDir}`);

}catch(err){
    const mod = err.span?.url ? moduleFromUrl(err.span.url) : 'unknown';
    // span.start.line is 0-based per the Sass JS API spec, so add 1 for display
    const line = err.span?.start?.line != null ? `:${err.span.start.line + 1}` : '';
    console.error('');
    console.error(`  ERR [${mod}${line}] ${err.sassMessage || err.message}`);
    buildFailed = true;

}finally{
    // Clean up the temp directory whether the build succeeded or failed.
    if(tempDir){
        try{
            fs.rmSync(tempDir, {recursive: true, force: true});
        }catch(cleanupErr){
            console.error(`  [atomic-css] WARNING: Could not clean up temp directory: ${cleanupErr.message}`);
        }
    }
}

// Exit after finally has cleaned up the temp directory.
if(buildFailed) process.exit(1);
