/** Offline check: node scripts/verify-order-status.js (no database needed) */
process.env.JWT_SECRET = "x";
const Module = require("module");
const assert = require("assert");
let db = {};
const real = Module._load;
Module._load = function (request) {
  if (/config\/prisma(\.js)?$/.test(request))
    return new Proxy({}, { get: (_t, k) => db[k] });
  if (/platformSetting\.service(\.js)?$/.test(request))
    return {
      getSetting: async () => "30",
      getNumberSetting: async () => 30,
      getBoolSetting: async () => true,
    };
  return real.apply(this, arguments);
};

const {
  getOrderStatusController,
} = require("./../controllers/order.controller");
const bookingService = require("./../services/booking.service");
const { clientMessage, isInternalDbError } = require("./../utils/safeError");

const run = async (fn) => {
  try {
    await fn();
    console.log("  ok  ", fn.name);
  } catch (e) {
    console.log("  FAIL", fn.name, "\n      ", e.message);
    process.exitCode = 1;
  }
};

// the exact order 3 from the bug report: expired booking, no payment
const booking = {
  id: 6,
  status: "expired",
  slotStart: new Date("2026-10-14T11:30:00Z"),
  slotEnd: new Date("2026-10-14T13:30:00Z"),
  payment: null,
};
const order = {
  id: 3,
  gym: { id: 1, name: "Bole Fitness Hub" },
  totalAmount: "650",
  needsManualRefund: false,
  refundNote: null,
  createdAt: new Date("2026-10-14T07:03:57Z"),
  booking,
  items: [],
};

(async () => {
  await run(async function order_status_is_a_string_not_an_empty_object() {
    db = { order: { findFirst: async () => order } };
    let body;
    const res = { status: () => ({ json: (b) => (body = b) }) };
    await getOrderStatusController(
      { params: { id: "3" }, user: { id: 1 } },
      res,
    );
    assert.strictEqual(typeof body.order.status, "string");
    assert.strictEqual(body.order.status, "EXPIRED");
    assert.strictEqual(JSON.stringify(body).includes('"status":{}'), false);
  });

  await run(async function order_status_values() {
    for (const [status, expected] of [
      ["confirmed", "PAID"],
      ["checked_in", "PAID"],
      ["cancelled", "CANCELLED"],
      ["payment_failed", "FAILED"],
      ["expired", "EXPIRED"],
    ]) {
      db = {
        order: {
          findFirst: async () => ({
            ...order,
            booking: { ...booking, status },
          }),
        },
      };
      let body;
      await getOrderStatusController(
        { params: { id: "3" }, user: { id: 1 } },
        { status: () => ({ json: (b) => (body = b) }) },
      );
      assert.strictEqual(body.order.status, expected);
    }
  });

  await run(async function member_booking_list_has_orderStatus_string() {
    const empty = {
      updateMany: async () => ({ count: 0 }),
      findMany: async () => [],
      count: async () => 0,
    };
    db = {
      booking: {
        ...empty,
        findMany: async (args) =>
          args && args.include
            ? [{ ...booking, order, package: null, sessions: [] }]
            : [],
      },
      trainingSession: empty,
      providerPackagePurchase: empty,
      consultationAccess: empty,
      memberPackage: empty,
      order: empty,
      $transaction: async (fn) => fn(db),
    };
    const list = await bookingService.getMemberBookings(1);
    assert.strictEqual(list[0].orderStatus, "EXPIRED");
  });

  await run(async function prisma_errors_are_not_sent_to_the_client() {
    const prismaErr = Object.assign(
      new Error(
        "Invalid `prisma.booking.findUnique()` invocation in /home/ab_normal/projects/gym-backend/backend/services/payment.service.js:222:40",
      ),
      { name: "PrismaClientKnownRequestError" },
    );
    assert.strictEqual(isInternalDbError(prismaErr), true);
    assert.strictEqual(
      clientMessage(
        prismaErr,
        "Payment could not be initialized. Please retry.",
      ),
      "Payment could not be initialized. Please retry.",
    );
    assert.strictEqual(
      clientMessage(new Error("Booking has expired"), "x"),
      "Booking has expired",
    );
  });
})();
