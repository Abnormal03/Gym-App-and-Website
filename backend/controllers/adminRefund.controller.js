const prisma = require("../config/prisma");

const confirmManualRefund = async (req, res) => {
  const orderId = Number(req.params.orderId);
  const adminId = Number(req.auth?.adminId || req.auth?.id);
  const refundReference =
    typeof req.body?.refundReference === "string"
      ? req.body.refundReference.trim()
      : null;

  if (!Number.isSafeInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid order ID" });
  }
  if (!Number.isSafeInteger(adminId) || adminId <= 0) {
    return res.status(401).json({ success: false, message: "Admin identity is invalid" });
  }
  if (refundReference && refundReference.length > 200) {
    return res.status(400).json({ success: false, message: "Refund reference is too long" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, gym: { adminId } },
        include: { booking: { include: { payment: true } } },
      });

      if (!order) return { error: "Order not found", status: 404 };
      if (!order.needsManualRefund && order.booking.payment?.status !== "refunded") {
        return { error: "Order is not awaiting manual refund review", status: 409 };
      }
      const payment = order.booking.payment;
      if (!payment) return { error: "Order has no payment record", status: 409 };
      if (payment.status !== "success" && payment.status !== "refunded") {
        return { error: "Only a successful payment can be marked refunded", status: 409 };
      }

      const refundedAt = payment.refundedAt || new Date();
      const updatedPayment = payment.status === "refunded"
        ? payment
        : await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: "refunded",
              refundedAt,
              refundedByAdminId: adminId,
              refundReference,
            },
          });

      await tx.order.update({
        where: { id: order.id },
        data: {
          needsManualRefund: false,
          refundNote: `Manual refund confirmed by admin ${adminId} on ${refundedAt.toISOString()}${refundReference ? ` (reference: ${refundReference})` : ""}.`,
        },
      });

      return {
        payment: updatedPayment,
        orderId: order.id,
        needsManualRefund: false,
      };
    });

    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error("Confirm manual refund error:", error);
    return res.status(500).json({ success: false, message: "Failed to record refund" });
  }
};

module.exports = { confirmManualRefund };
