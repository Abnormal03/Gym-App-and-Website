process.env.DATABASE_URL = "postgresql://dummy";
const { changePassword } = require("./controllers/user.controller.js");
async function runTests() {
    const mockRes = () => {
        const res = { statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
        return res;
    };
    const test73Chars = mockRes();
    await changePassword({ body: { currentPassword: "old", newPassword: "a".repeat(73) }, user: {id: 1} }, test73Chars);
    console.log("Test 73 ASCII chars:", test73Chars.statusCode, test73Chars.body);
    const test72Chars = mockRes();
    await changePassword({ body: { currentPassword: "old", newPassword: "a".repeat(72) }, user: {id: 1} }, test72Chars);
    constole.log("Test 72 ASCII chars:", test72Chars.statusCode, test72Chars.body);
    const testMultibyte = mockRes();
    await changePassword({ body: { currentPasword: "old", newPassword: "🔥".repeat(20) }, user: {id: 1} }, testMultibyte);
    constole.log("Test 20 emoji (80 bytes):", testMultibyte.statusCode, testMultibyte.body);
}
runTests();