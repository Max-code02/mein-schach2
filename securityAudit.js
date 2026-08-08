// securityAudit.js - DEFENSIVE SECURITY & INPUT VALIDATION TEST SUITE
// Runs automated defensive fuzzing & sanity checks against antihack.js and antispam.js

const { validateSecurity, validateTimeDelta, validateTurnAuthorization } = require('./antihack.js');
const { isSpamming } = require('./antispam.js');
const { isNameAllowed } = require('./badnames.js');

console.log("=================================================");
console.log("🛡️ RUNNING AUTOMATED DEFENSIVE SECURITY AUDIT 🛡️");
console.log("=================================================\n");

let passed = 0;
let failed = 0;

function assertTest(testName, condition) {
    if (condition) {
        console.log(`✅ [PASS] ${testName}`);
        passed++;
    } else {
        console.error(`❌ [FAIL] ${testName}`);
        failed++;
    }
}

// Dummy Mock WebSocket for testing
function createMockWS(ip = "192.168.1.50", playerName = "TestPlayer", isAdmin = false) {
    const sentMessages = [];
    return {
        clientIP: ip,
        playerName: playerName,
        isAdmin: isAdmin,
        readyState: 1,
        sentMessages: sentMessages,
        send: function(msg) {
            sentMessages.push(JSON.parse(msg));
        }
    };
}

console.log("--- 1. ANTI-HACK INPUT VALIDATION TESTS ---");

// Test 1: Null or non-object payloads
const mockWs1 = createMockWS();
const res1 = validateSecurity(null, mockWs1, new Set(), null);
assertTest("Reject Null Payload", res1 === false || res1 === 'handled');

// Test 2: Over-sized Payload (Buffer overflow / memory stress)
const hugePayload = { type: 'chat', text: 'A'.repeat(6000) };
const mockWs2 = createMockWS();
const res2 = validateSecurity(hugePayload, mockWs2, new Set(), null);
assertTest("Reject Oversized Payload (> 5000 chars)", res2 === false);

// Test 3: SQL Injection Detection
const sqlPayload = { type: 'login', playerName: "user' OR '1'='1" };
const mockWs3 = createMockWS();
const res3 = validateSecurity(sqlPayload, mockWs3, new Set(), null);
assertTest("Intercept SQL Injection Attack", res3 === false);

// Test 4: XSS Script Injection
const xssPayload = { type: 'chat', text: "<script>alert('xss')</script>" };
const mockWs4 = createMockWS();
const res4 = validateSecurity(xssPayload, mockWs4, new Set(), null);
assertTest("Intercept XSS Script Injection", res4 === false);

// Test 5: Out of Bounds Board Coordinates
const badMovePayload = { type: 'move', fr: 0, fc: 0, tr: 9, tc: 4 }; // tr: 9 is invalid
const mockWs5 = createMockWS();
const res5 = validateSecurity(badMovePayload, mockWs5, new Set(), null);
assertTest("Intercept Out-of-Bounds Move Coordinates", res5 === false);

// Test 6: Zero-Move Manipulation
const zeroMovePayload = { type: 'move', fr: 3, fc: 3, tr: 3, tc: 3 };
const mockWs6 = createMockWS();
const res6 = validateSecurity(zeroMovePayload, mockWs6, new Set(), null);
assertTest("Intercept Zero-Distance Move Manipulation", res6 === false);

// Test 7: Time Drift / Clock Speed Hack
const timeDriftPayload = { type: 'move', fr: 1, fc: 0, tr: 2, tc: 0, timestamp: Date.now() + 60000 };
const mockWs7 = createMockWS();
const res7 = validateSecurity(timeDriftPayload, mockWs7, new Set(), null);
assertTest("Intercept Clock Speed Drift (>15s future)", res7 === false);

// Test 8: Admin Spoofing Attempt
const adminSpoofPayload = { type: 'chat', text: 'hello', system: true };
const mockWs8 = createMockWS();
const res8 = validateSecurity(adminSpoofPayload, mockWs8, new Set(), null);
assertTest("Intercept Unauthorized System Flag Spoofing", res8 === false);

console.log("\n--- 2. BAD NAME & HOMOGLYPH FILTER TESTS ---");

// Test 9: System reserved names
assertTest("Disallow 'admin' name", isNameAllowed("admin") === false);
assertTest("Disallow 'system' name", isNameAllowed("system") === false);
assertTest("Disallow hidden unicode spaces", isNameAllowed("test\u200Buser") === false);
assertTest("Allow legitimate name 'SchachMeister99'", isNameAllowed("SchachMeister99") === true);

console.log("\n--- 3. ANTI-SPAM PROTECTION TESTS ---");

// Test 10: Message Spam Flood
const spammerWs = createMockWS("10.0.0.99", "Spammer");
let isBlocked = false;
for (let i = 0; i < 7; i++) {
    isBlocked = isSpamming(spammerWs, `Message #${i}`);
}
assertTest("Mute User After Exceeding Rate Limit", isBlocked === true);

console.log("\n=================================================");
console.log(`📊 AUDIT SUMMARY: ${passed} Passed | ${failed} Failed`);
console.log("=================================================");

if (failed === 0) {
    console.log("🎉 ALL DEFENSIVE SECURITY CONTROLS ARE WORKING PERFECTLY!");
} else {
    console.warn("⚠️ SOME SECURITY CONTROLS NEED ATTENTION.");
}
