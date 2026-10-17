import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requirePermission } from '../middleware/authMiddleware.js';
import { realtime, orderEventPayload } from '../utils/realtime.js';

export const realtimeRoutes = Router();

// How often we send a comment line to keep proxies from closing an idle stream.
const HEARTBEAT_MS = 20_000;
// Safety cap for the "what did I miss while offline" catch-up query.
const CATCHUP_LIMIT = 50;

function writeEvent(res, entry) {
  // SSE frame: optional id:, required event:, one or more data: lines.
  const lines = [];
  if (entry.id != null) lines.push(`id: ${entry.id}`);
  lines.push(`event: ${entry.event}`);
  lines.push(`data: ${JSON.stringify(entry.data ?? {})}`);
  res.write(`${lines.join('\n')}\n\n`);
}

/**
 * Live order feed for the mobile admin app.
 *
 * The app opens this stream once and keeps it open; every new order created on
 * the storefront (or the POS) is pushed down immediately, no polling and no
 * third-party push service involved.
 *
 *   GET /api/realtime/orders/stream
 *   GET /api/realtime/orders/stream?sinceOrderId=1234
 *
 * Events emitted:
 *   ready         - sent once on connect, includes the current server time
 *   order:new     - a new order was created
 *   order:updated - an existing order changed
 */
realtimeRoutes.get(
  '/realtime/orders/stream',
  requireAuth,
  requirePermission('orders', 'read'),
  async (req, res) => {
    res.status(200);
    res.set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Tell nginx (and friends) not to buffer the stream.
      'X-Accel-Buffering': 'no',
    });
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    // Comment line confirms the stream is live; `retry` sets the client's
    // reconnect delay if the connection ever drops.
    res.write(': connected\n\n');
    res.write('retry: 4000\n\n');

    let closed = false;

    // Replay anything buffered in-process that this client hasn't seen yet.
    const lastEventId = req.headers['last-event-id'] ?? req.query.lastEventId;
    for (const entry of realtime.eventsSince(lastEventId)) {
      writeEvent(res, entry);
    }

    // Catch-up from the database: the app sends the id of the last order it
    // knows about, so orders that arrived while the phone was offline are not
    // silently lost (and are not alerted twice thanks to client-side dedupe).
    const sinceOrderId = Number(req.query.sinceOrderId);
    if (Number.isFinite(sinceOrderId) && sinceOrderId > 0) {
      try {
        const [rows] = await pool.query(
          'SELECT * FROM orders WHERE id > ? ORDER BY id ASC LIMIT ?',
          [sinceOrderId, CATCHUP_LIMIT]
        );
        for (const row of rows || []) {
          const payload = orderEventPayload(row, 'catchup');
          if (payload) writeEvent(res, { event: 'order:new', data: payload });
        }
      } catch (err) {
        // A failed catch-up must never kill the live stream.
        console.error('SSE order catch-up failed:', err.message);
      }
    }

    writeEvent(res, {
      event: 'ready',
      data: { serverTime: new Date().toISOString(), stream: 'orders', lastEventId: realtime.currentId() },
    });

    const onEvent = (entry) => {
      if (!closed) writeEvent(res, entry);
    };
    realtime.on('event', onEvent);

    const heartbeat = setInterval(() => {
      if (!closed) res.write(`: keep-alive ${Date.now()}\n\n`);
    }, HEARTBEAT_MS);

    // A long-lived response must not be killed by the server's socket timeout.
    req.socket?.setTimeout(0);
    res.socket?.setTimeout(0);

    const cleanup = () => {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      realtime.off('event', onEvent);
      try {
        res.end();
      } catch {
        /* already torn down */
      }
    };

    req.on('close', cleanup);
    req.on('aborted', cleanup);
    res.on('close', cleanup);
  }
);

/** Lightweight diagnostics so the app (or you, with curl) can confirm the hub. */
realtimeRoutes.get('/realtime/status', requireAuth, (req, res) => {
  res.json({
    success: true,
    clients: realtime.clientCount(),
    lastEventId: realtime.currentId(),
    serverTime: new Date().toISOString(),
  });
});
