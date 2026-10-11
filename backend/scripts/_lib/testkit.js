/**
 * Tiny test kit shared by the A2/A3 check scripts. They call the RUNNING dev server over HTTP
 * (and use Prisma only for fixtures and cleanup), so start your server first.
 *
 * Settings (env, or a .env file in backend/):
 *   API_BASE          default http://localhost:5000/api     (where the routes are mounted)
 *   ADMIN_PREFIX      default /admin                        (where admin.route.js is mounted under API_BASE)
 *   ADMIN_LOGIN_PATH  default /auth/admin/login             (your V1 gym admin login)
 *   ADMIN_EMAIL / ADMIN_PASSWORD   default admin@gym.test / Admin123!   (from the seed)
 *   ADMIN_TOKEN       optional: skip the admin login and use this token
 */
try {
    require('dotenv').config();
} catch (_) {
    /* dotenv not installed: rely on the real environment */
}
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const API_BASE = (process.env.API_BASE || 'http://localhost:5000/api').replace(/\/$/, '');
const ADMIN_PREFIX = process.env.ADMIN_PREFIX || '/admin';
const ADMIN_LOGIN_PATH = process.env.ADMIN_LOGIN_PATH || '/auth/admin/login';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gym.test';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';
const SEED_PASSWORD = 'Test1234!';
const SKIP = Symbol('skip');

// ---------- HTTP ----------
async function http(method, path, { token, body } = {}) {
    let res;
    try {
        res = await fetch(API_BASE + path, {
            method,
            headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch (e) {
        throw new Error(`Cannot reach ${API_BASE}${path} (${e.message}). Is the server running? Check API_BASE.`);
    }
    let json = null;
    try {
        json = await res.json();
    } catch (_) {
        /* empty or non-JSON body */
    }
    return { status: res.status, body: json, data: json ? json.data : undefined, error: json ? json.error : undefined };
}
const admin = (method, path, opts) => http(method, ADMIN_PREFIX + path, opts);

const tokenFrom = (json) =>
    json && (json.token || (json.data && (json.data.token || json.data.accessToken)) || json.accessToken);

async function loginAdmin(email = ADMIN_EMAIL, password = ADMIN_PASSWORD, { expectedAdminId } = {}) {
    if (email === ADMIN_EMAIL && process.env.ADMIN_TOKEN) {
        const claims = jwt.decode(process.env.ADMIN_TOKEN);
        const role = String(claims?.role || claims?.type || '').toLowerCase().replace(/[^a-z]/g, '');
        const tokenAdminId = Number(claims?.adminId ?? claims?.userId ?? claims?.id);
        const matchesExpectedAdmin =
            expectedAdminId === undefined ||
            ((role === 'gymadmin' || role === 'admin') && tokenAdminId === expectedAdminId);
        if (matchesExpectedAdmin) return process.env.ADMIN_TOKEN;
    }
    const r = await http('POST', ADMIN_LOGIN_PATH, { body: { email, password } });
    const token = tokenFrom(r.body);
    if (!token) {
        throw new Error(
            `Admin login failed (${r.status}) on ${ADMIN_LOGIN_PATH}: ${JSON.stringify(r.body)}. ` +
            'Set ADMIN_LOGIN_PATH, or ADMIN_TOKEN to skip the login.',
        );
    }
    return token;
}
async function loginProvider(email, password = SEED_PASSWORD) {
    const r = await http('POST', '/auth/provider/login', { body: { email, password } });
    return { ...r, token: tokenFrom(r.body) };
}
async function loginStaff(email, password = SEED_PASSWORD) {
    const r = await http('POST', '/auth/staff/login', { body: { email, password } });
    return { ...r, token: tokenFrom(r.body) };
}

// ---------- Prisma (fixtures + cleanup only) ----------
let prismaCache;
function getPrisma() {
    if (prismaCache !== undefined) return prismaCache;
    try {
        const m = require('../../config/prisma');
        prismaCache = m.prisma || m;
    } catch (_) {
        prismaCache = null;
    }
    return prismaCache;
}

// ---------- assertions ----------
/** expect(res) = 200 | expect(res, 201) | expect(res, 403, 'FORBIDDEN') */
function expect(res, status = 200, code) {
    assert.equal(res.status, status, `expected HTTP ${status}, got ${res.status}: ${JSON.stringify(res.body)}`);
    if (code) assert.equal(res.error && res.error.code, code, `expected error code ${code}: ${JSON.stringify(res.body)}`);
    return res;
}
const uniq = (prefix) => `${prefix}.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ---------- suite runner ----------
function createSuite(title) {
    const tests = [];
    let beforeFn = null;
    return {
        before(fn) {
            beforeFn = fn;
        },
        test(name, fn) {
            tests.push({ name, fn });
        },
        async run(cleanup) {
            console.log(`\n${title}  (API: ${API_BASE})`);
            let passed = 0;
            let failed = 0;
            let skipped = 0;
            try {
                if (beforeFn) await beforeFn();
                for (const t of tests) {
                    try {
                        const r = await t.fn();
                        if (r === SKIP) {
                            skipped += 1;
                            console.log(`  - skipped  ${t.name}`);
                        } else {
                            passed += 1;
                            console.log(`  ✔ ${t.name}`);
                        }
                    } catch (e) {
                        failed += 1;
                        console.log(`  ✘ ${t.name}\n      ${String(e.message).split('\n')[0]}`);
                    }
                }
            } catch (e) {
                failed += 1;
                console.log(`  ✘ SETUP FAILED: ${e.message}`);
            }
            if (cleanup) {
                try {
                    await cleanup();
                } catch (e) {
                    console.log(`  (cleanup problem, check the dev DB by hand: ${e.message})`);
                }
            }
            console.log(`  ${passed} passed, ${failed} failed, ${skipped} skipped`);
            const prisma = getPrisma();
            if (prisma && prisma.$disconnect) await prisma.$disconnect();
            process.exit(failed ? 1 : 0);
        },
    };
}

module.exports = {
    API_BASE, ADMIN_PREFIX, ADMIN_EMAIL, ADMIN_PASSWORD, SEED_PASSWORD, SKIP,
    http, admin, loginAdmin, loginProvider, loginStaff, getPrisma, expect, uniq, createSuite, assert,
};