import type { IOrder } from "@/models/Order";

/** Customer-facing view of an order — no Stripe ids, no internal flags. */
export function serializeOrder(order: IOrder) {
  return {
    id: String(order._id),
    orderNumber: order.orderNumber,
    email: order.email,
    status: order.status,
    paymentStatus: order.paymentStatus,
    items: order.items.map((item) => ({
      productId: String(item.productId),
      variantId: String(item.variantId),
      title: item.title,
      variantTitle: item.variantTitle,
      sku: item.sku,
      slug: item.slug,
      image: item.image,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    subtotal: order.subtotal,
    discountTotal: order.discountTotal,
    shippingTotal: order.shippingTotal,
    taxTotal: order.taxTotal,
    grandTotal: order.grandTotal,
    currency: order.currency,
    couponCode: order.couponCode ?? null,
    shippingAddress: order.shippingAddress ?? null,
    billingAddress: order.billingAddress ?? null,
    fulfillment: order.fulfillment
      ? {
          carrier: order.fulfillment.carrier ?? null,
          trackingNumber: order.fulfillment.trackingNumber ?? null,
          trackingUrl: order.fulfillment.trackingUrl ?? null,
          shippedAt: order.fulfillment.shippedAt ?? null,
          deliveredAt: order.fulfillment.deliveredAt ?? null,
        }
      : null,
    timeline: (order.timeline ?? []).map((event) => ({
      status: event.status,
      note: event.note ?? "",
      at: event.at,
    })),
    customerNote: order.customerNote ?? "",
    paidAt: order.paidAt ?? null,
    createdAt: order.createdAt,
  };
}

export function serializeOrderSummary(order: IOrder) {
  return {
    id: String(order._id),
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    grandTotal: order.grandTotal,
    currency: order.currency,
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    firstItem: order.items[0]
      ? { title: order.items[0].title, image: order.items[0].image, slug: order.items[0].slug }
      : null,
    createdAt: order.createdAt,
  };
}
