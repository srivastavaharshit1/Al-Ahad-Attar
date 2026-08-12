# Cancellation & Refund Policy — Final Business Rules

This is the authoritative reference for how order cancellation and refunds work. It reflects a
finalized business decision — do not reintroduce COD, automatic refunds on cancellation, returns,
or post-delivery refund requests without an explicit new decision overriding this document.

## The rules

1. **All orders are prepaid online via Razorpay.** There is no Cash on Delivery.
2. **A customer can cancel their own order only while it is CONFIRMED.**
3. **PACKED is the cancellation cutoff** — the instant an order becomes PACKED, cancellation
   becomes impossible for every actor (customer or admin), with no exceptions.
4. **Cancellation restores inventory** for every item on the order, exactly once, atomically.
5. **Cancelling a paid order creates `RefundStatus.REFUND_REQUIRED`.** It does **not** call
   Razorpay. Cancellation and refund are two separate lifecycles.
6. **Only an admin can trigger the actual Razorpay refund**, via the Refund Management page
   (`Process Refund`). The amount is always the order's trusted total — never client-supplied,
   never partial.
7. **No returns, no post-delivery refund requests, no replacement workflow.** The only refund path
   in this system is: cancel before PACKED → admin processes a full refund.
8. **Order status and refund status are separate.** `OrderStatus` never has a REFUNDED value —
   refund state lives entirely on `RefundStatus`/the `Refund` audit table.

## State machines

**Order status** (`OrderStatus`): `CONFIRMED → PACKED → SHIPPED → DELIVERED`, or `CONFIRMED →
CANCELLED`. Every other transition (`PACKED → CANCELLED`, `DELIVERED → SHIPPED`, `CANCELLED →
anything`, etc.) is rejected server-side — enforced atomically via
`OrderRepository.claimStatusTransition`/`claimCancellation` (conditional `UPDATE ... WHERE
status = <required>`), not just application-level checks. This is what makes the "customer
cancels at the exact instant admin marks packed" race resolve safely: only one of the two
concurrent UPDATEs can match its `WHERE` clause.

**Refund status** (`RefundStatus`): `NOT_REQUIRED` (order was never paid) → **`REFUND_REQUIRED`**
(cancelled, paid, awaiting admin) → `PROCESSING` (admin clicked Process Refund, Razorpay call in
flight) → **`REFUNDED`** (Razorpay confirmed) or `FAILED` (Razorpay rejected, or outcome
unconfirmed — admin can retry/reconcile). `PROCESSING` is claimed atomically
(`OrderRepository.claimRefundProcessing`) so two concurrent "Process Refund" clicks — or two
admins — can never both call Razorpay.

## Where the logic lives

- `RefundTransactionSupport` (`service/impl/`) — every DB-only phase of cancel/refund as its own
  short `@Transactional` method, so the blocking Razorpay HTTP call in `OrderServiceImpl` never
  holds a pooled JDBC connection. Owns the atomic claims, inventory restoration, and refund-state
  transitions.
- `OrderServiceImpl.cancelOrder` (customer) / `adminCancelOrder` (admin) — both delegate to
  `RefundTransactionSupport`, differing only in ownership scoping. Neither ever calls
  `PaymentService.initiateRefund`.
- `OrderServiceImpl.initiateRefund` (admin-only) — the only code path that calls Razorpay's refund
  API. Handles the stuck-`PROCESSING` case (see below) by reconciling instead of blindly retrying.
- `PaymentServiceImpl.handleWebhookEvent` — Razorpay's `refund.processed`/`refund.failed` webhook
  is the independent async source of truth, wired to `RefundTransactionSupport.reconcileRefundFromWebhook`.

## Duplicate-refund protection (money integrity)

Every scenario in the "must never produce two refunds" list is closed by a specific mechanism:

| Scenario | Mechanism |
|---|---|
| Admin double-clicks / two tabs / two admins | Atomic `claimRefundProcessing` UPDATE — only one request's `WHERE refundStatus NOT IN (PROCESSING, REFUNDED)` can match |
| Frontend/network retry after a normal response | Same atomic claim — a second call sees `refundStatus = PROCESSING` or `REFUNDED` and is rejected before Razorpay is ever called again |
| Razorpay accepted the refund, but the app crashed/timed out before recording it (order stuck `PROCESSING`) | Two independent recovery paths: (1) the `refund.processed`/`refund.failed` **webhook** reconciles automatically, no admin action needed; (2) if an admin clicks "Process Refund" again on a `PROCESSING` order, `initiateRefund` calls `PaymentService.checkExistingRefund` (queries Razorpay's own refund list for that payment) instead of calling Razorpay again — confirmed success/failure updates state, a genuinely unknown outcome rejects the attempt with no state change and no new Razorpay call |
| Razorpay SDK has no idempotency-key support on the refund call itself | `PaymentServiceImpl.initiateRefund` pre-checks Razorpay's own refund records for a matching amount before ever issuing a new refund request |

**What this deliberately does *not* do**: it never assumes success or failure when the outcome is
unconfirmed (`checkExistingRefund` returning empty rejects the retry with a clear message rather
than guessing), and it never retries Razorpay blindly on a timeout.

## Object model

- `Order.refundStatus` / `refundId` / `refundAmount` / `refundInitiatedAt` / `refundCompletedAt` /
  `refundFailureReason` / `refundInitiatedBy` — the current-state view, read directly by API
  consumers/UI.
- `Order.cancelledAt` / `cancelledBy` — set once, at the CONFIRMED→CANCELLED transition.
  `cancelledBy` is the order owner's email for a self-cancellation, or the admin's email for an
  admin-initiated one.
- `Refund` entity — the durable, append-only audit trail. One row per attempt, including failed
  ones, so retry history survives. `razorpay_refund_id` has a unique DB index (nullable-safe) as a
  hard backstop against two rows ever recording the same Razorpay refund.

## Non-goals (explicitly out of scope)

- Cash on Delivery, or any COD-adjacent status/branch.
- Product returns, return windows, or replacement workflows.
- Refund requests initiated after DELIVERED.
- Partial refunds — this policy is full-refund-only; `refundAmount` is always the order total.
- Admin specifying a refund amount — it's always derived from trusted order data.
