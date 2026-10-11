const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');

const SALT_ROUNDS = 10;
// No 0/O/1/l/I so a password read aloud or typed from a screenshot is not misread.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

const hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS);

/** Random temporary password (10 chars, always has a letter and a digit). Shown to the admin ONCE, never stored in clear. */
function generateTempPassword(length = 10) {
    for (; ;) {
        let out = '';
        for (let i = 0; i < length; i++) out += ALPHABET[crypto.randomInt(ALPHABET.length)];
        if (/[A-Za-z]/.test(out) && /\d/.test(out)) return out;
    }
}

module.exports = { hashPassword, generateTempPassword, SALT_ROUNDS };