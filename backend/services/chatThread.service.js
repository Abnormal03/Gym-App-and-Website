/**
 * One chat thread per (member, provider). Whether the member can WRITE is not stored here:
 * it is computed from active access (an ACTIVE package purchase or consultation for the pair), see task A6.
 */

/** Find the thread or create it. Safe to call many times and from concurrent requests. */
async function ensureChatThread(tx, userId, providerId) {
    return tx.chatThread.upsert({
        where: { userId_providerId: { userId, providerId } },
        update: {},
        create: { userId, providerId },
    });
}

module.exports = { ensureChatThread };