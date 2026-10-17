import { EventEmitter } from 'node:events';

/**
 * In-process pub/sub hub used to push live events (new orders, status changes)
 * to connected clients over Server-Sent Events.
 *
 * There is no external queue or push provider involved on purpose: the admin
 * app keeps an SSE connection open to `/api/realtime/orders/stream` and this hub
 * fans every published event out to the connections that are currently open.
 *
 * Recent events are kept in a small ring buffer so a client that reconnects can
 * replay anything it missed during the gap.
 */

const BUFFER_LIMIT = 100;
const BUFFER_TTL_MS = 10 * 60 * 1000;

class RealtimeHub extends EventEmitter {
  constructor() {
    super();
    // One listener per connected client; the default cap of 10 is too low.
    this.setMaxListeners(0);
    this.buffer = [];
    this.sequence = 0;
  }

  /** Publish an event to every connected client and remember it for replays. */
  publish(event, data) {
    const entry = {
      id: ++this.sequence,
      event,
      data: data ?? {},
      at: Date.now(),
    };
    this.buffer.push(entry);
    this.prune();
    this.emit('event', entry);
    return entry;
  }

  prune() {
    const cutoff = Date.now() - BUFFER_TTL_MS;
    while (this.buffer.length > 0 && (this.buffer.length > BUFFER_LIMIT || this.buffer[0].at < cutoff)) {
      this.buffer.shift();
    }
  }

  /** Current sequence number (the id of the most recent event, if any). */
  currentId() {
    return this.sequence;
  }

  /** Buffered events newer than `lastEventId`, oldest first. */
  eventsSince(lastEventId) {
    const id = Number(lastEventId);
    if (!Number.isFinite(id) || id <= 0) return [];
    return this.buffer.filter((entry) => entry.id > id);
  }

  /** Number of SSE clients currently subscribed. */
  clientCount() {
    return this.listenerCount('event');
  }
}

export const realtime = new RealtimeHub();

/**
 * Shapes an order row (raw DB row or API object) into the payload the mobile app
 * consumes. Kept intentionally small: the notification only needs enough detail
 * to identify the order, not the full record.
 */
export function orderEventPayload(order, source = 'website') {
  if (!order) return null;
  return {
    id: Number(order.id) || null,
    orderNumber: order.order_number ?? order.orderNumber ?? null,
    customerName: order.customer_name ?? order.customerName ?? null,
    customerEmail: order.customer_email ?? order.customerEmail ?? null,
    productName: order.product_name ?? order.productName ?? null,
    amount: Number(order.amount) || 0,
    status: String(order.status || 'pending'),
    paymentMethod: order.payment_method ?? order.paymentMethod ?? null,
    source,
    createdAt: order.created_at ? new Date(order.created_at).toISOString() : new Date().toISOString(),
  };
}

/** Announce a brand new order. Called from every code path that creates one. */
export function publishNewOrder(order, source = 'website') {
  const payload = orderEventPayload(order, source);
  if (!payload) return null;
  return realtime.publish('order:new', payload);
}

/** Announce an order change (status, payment, delivery…). */
export function publishOrderUpdate(order, source = 'admin') {
  const payload = orderEventPayload(order, source);
  if (!payload) return null;
  return realtime.publish('order:updated', payload);
}

export default realtime;
