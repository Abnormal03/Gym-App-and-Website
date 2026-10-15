const prisma = require("../config/prisma");
const { getOrderStatus } = require("../services/bookingHelpers.service");

const getOrderStatusController = async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const userId = Number(req.user.id);

    if (
      !Number.isSafeInteger(orderId) ||
      orderId <= 0 ||
      !Number.isSafeInteger(userId) ||
      userId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID or user ID",
      });
    }

    // Restrict the query to this authenticated user.
    // Another user's order will not be exposed.
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
        booking: {
          include: {
            payment: true,
          },
        },
        items: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // getOrderStatus is async: without await the JSON shows "status": {}
    const status = await getOrderStatus(order, order.booking);
    const payment = order.booking.payment;

    return res.status(200).json({
      success: true,
      order: {
        id: order.id,
        gym: order.gym,
        totalAmount: order.totalAmount,
        currency: payment?.currency ?? "ETB",
        status,
        needsManualRefund: order.needsManualRefund,
        refundNote: order.refundNote,
        createdAt: order.createdAt,
        booking: {
          id: order.booking.id,
          status: order.booking.status,
          slotStart: order.booking.slotStart,
          slotEnd: order.booking.slotEnd,
        },
        payment: payment
          ? {
              status: payment.status,
              chapaTxRef: payment.chapaTxRef,
              chapaCheckoutUrl: payment.chapaCheckoutUrl,
            }
          : null,
        items: order.items,
      },
    });
  } catch (error) {
    console.error("Get order status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve order status",
    });
  }
};

module.exports = {
  getOrderStatusController,
};
