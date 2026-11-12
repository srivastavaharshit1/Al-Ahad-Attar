package com.alahadattars.billing.online;

import com.alahadattars.billing.invoice.GstStatus;
import com.alahadattars.billing.invoice.InvoiceChannel;
import com.alahadattars.billing.invoice.InvoiceCustomerSnapshot;
import com.alahadattars.billing.invoice.InvoiceDocumentService;
import com.alahadattars.billing.invoice.InvoiceLineSnapshot;
import com.alahadattars.billing.invoice.InvoiceNumberAllocator;
import com.alahadattars.billing.invoice.InvoiceNumberValue;
import com.alahadattars.billing.invoice.InvoiceSnapshot;
import com.alahadattars.billing.invoice.InvoiceSourceType;
import com.alahadattars.billing.invoice.InvoiceTaxSnapshot;
import com.alahadattars.billing.invoice.InvoiceWordingProvider;
import com.alahadattars.entity.Order;
import com.alahadattars.entity.OrderItem;
import com.alahadattars.enums.OrderStatus;
import com.alahadattars.enums.PaymentStatus;
import com.alahadattars.enums.RefundStatus;
import com.alahadattars.repository.OrderRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class OnlineInvoiceGenerationService {
    private final OnlineInvoiceJobJdbcRepository jobs;
    private final OrderRepository orders;
    private final JdbcTemplate jdbc;
    private final OnlineInvoiceConfiguration configuration;
    private final InvoiceNumberAllocator numberAllocator;
    private final InvoiceDocumentService documents;
    private final InvoiceWordingProvider wording;

    public OnlineInvoiceGenerationService(OnlineInvoiceJobJdbcRepository jobs, OrderRepository orders,
                                          JdbcTemplate jdbc, OnlineInvoiceConfiguration configuration,
                                          InvoiceNumberAllocator numberAllocator, InvoiceDocumentService documents,
                                          InvoiceWordingProvider wording) {
        this.jobs = jobs;
        this.orders = orders;
        this.jdbc = jdbc;
        this.configuration = configuration;
        this.numberAllocator = numberAllocator;
        this.documents = documents;
        this.wording = wording;
    }

    @Transactional
    public void process(OnlineInvoiceJob job) {
        int owned = jdbc.update("""
                UPDATE billing_online_invoice_job SET updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND job_status = 'PROCESSING' AND attempt_count = ?
                """, job.id(), job.attemptNumber());
        if (owned != 1) return;

        var existing = jobs.findExistingOnlineInvoiceId(job.orderId());
        if (existing.isPresent()) {
            jobs.complete(job, existing.get());
            return;
        }

        Order order = orders.findById(job.orderId()).orElse(null);
        if (order == null || !eligible(order)) {
            jobs.skipIneligible(job, "Payment/order state is no longer eligible for an online invoice.");
            return;
        }

        configuration.validate();
        OrderSnapshot snapshot = snapshot(order);
        InvoiceNumberValue allocated = numberAllocator.next(InvoiceChannel.ONLINE, configuration.financialYear());
        String invoiceNumber = configuration.format(allocated);
        Instant issuedAt = Instant.now();
        InvoiceSnapshot invoice = new InvoiceSnapshot(UUID.randomUUID(), invoiceNumber, InvoiceChannel.ONLINE,
                InvoiceSourceType.ONLINE_ORDER, order.getId(), issuedAt, configuration.seller(), customer(order),
                snapshot.lines(), snapshot.subtotal(), snapshot.promotionDiscount(), BigDecimal.ZERO.setScale(2),
                snapshot.total(), InvoiceTaxSnapshot.noGst(), configuration.notice());
        wording.validate(invoice);
        long invoiceId = documents.generateAndStore(invoice, configuration.financialYear());
        jobs.complete(job, invoiceId);
    }

    private static boolean eligible(Order order) {
        return order.getPaymentStatus() == PaymentStatus.PAID
                && order.getStatus() != OrderStatus.CANCELLED
                && order.getRefundStatus() == RefundStatus.NOT_REQUIRED
                && "ONLINE".equalsIgnoreCase(order.getPaymentMethod())
                && order.getTransactionId() != null && !order.getTransactionId().isBlank();
    }

    private static InvoiceCustomerSnapshot customer(Order order) {
        String name = clean(order.getGuestName());
        String mobile = clean(order.getGuestPhone());
        String email = clean(order.getGuestEmail());
        if (order.getUser() != null) {
            if (name == null) name = clean(join(order.getUser().getFirstName(), order.getUser().getLastName()));
            if (mobile == null) mobile = clean(order.getUser().getPhone());
            if (email == null) email = clean(order.getUser().getEmail());
        }
        return name == null && mobile == null && email == null ? null : new InvoiceCustomerSnapshot(name, mobile, email);
    }

    private static OrderSnapshot snapshot(Order order) {
        List<DraftLine> draft = new ArrayList<>();
        BigDecimal computedItemDiscount = BigDecimal.ZERO.setScale(2);
        BigDecimal productGross = BigDecimal.ZERO.setScale(2);
        int lineNo = 1;
        for (OrderItem item : order.getItems()) {
            String name = firstNonBlank(item.getProductName(), item.getGiftSetName());
            if (name == null) throw invalid("A paid order line is missing its immutable name snapshot.");

            if (item.isFreeItem()) {
                Long promotionId = item.getFreePromotionId();
                if (promotionId == null) throw invalid("A free online order line has no promotion snapshot.");
                InvoiceLineSnapshot free = new InvoiceLineSnapshot(lineNo++, item.getVariant() == null ? null
                        : item.getVariant().getProduct().getId(), item.getVariant() == null ? null : item.getVariant().getId(),
                        name, item.getVariantSize(), item.getQuantity(), money(BigDecimal.ZERO), null, null,
                        money(BigDecimal.ZERO), money(BigDecimal.ZERO), money(BigDecimal.ZERO), money(BigDecimal.ZERO),
                        true, promotionId);
                draft.add(new DraftLine(free, BigDecimal.ZERO.setScale(2)));
                continue;
            }

            BigDecimal originalUnit = money(item.getOriginalPrice());
            BigDecimal bottleUnit = money(item.getBottlePrice());
            BigDecimal lineGross = originalUnit.add(bottleUnit).multiply(BigDecimal.valueOf(item.getQuantity())).setScale(2);
            BigDecimal savedSubtotal = money(item.getSubtotal());
            BigDecimal itemDiscount = lineGross.subtract(savedSubtotal).setScale(2);
            if (itemDiscount.signum() < 0) throw invalid("A saved online line total exceeds its immutable gross snapshot.");
            InvoiceLineSnapshot line = new InvoiceLineSnapshot(lineNo++, item.getVariant() == null ? null
                    : item.getVariant().getProduct().getId(), item.getVariant() == null ? null : item.getVariant().getId(),
                    name, item.getVariantSize(), item.getQuantity(), originalUnit,
                    item.getBottleId(), clean(item.getBottleName()), bottleUnit, itemDiscount,
                    BigDecimal.ZERO.setScale(2), savedSubtotal, false, null);
            draft.add(new DraftLine(line, savedSubtotal));
            productGross = productGross.add(lineGross);
            computedItemDiscount = computedItemDiscount.add(itemDiscount);
        }

        BigDecimal declaredItemDiscount = money(order.getOfferDiscountAmount());
        BigDecimal cartDiscount = money(order.getCouponDiscountAmount());
        if (computedItemDiscount.compareTo(declaredItemDiscount) != 0) {
            throw invalid("Saved online line discounts do not reconcile with the order discount snapshot.");
        }
        BigDecimal eligibleBalance = draft.stream().map(DraftLine::balanceBeforeCartDiscount)
                .reduce(BigDecimal.ZERO.setScale(2), BigDecimal::add);
        if (cartDiscount.compareTo(eligibleBalance) > 0) {
            throw invalid("Saved online cart discount exceeds its remaining item balance.");
        }
        List<BigDecimal> cartAllocations = allocate(cartDiscount, draft);
        List<InvoiceLineSnapshot> lines = new ArrayList<>();
        for (int i = 0; i < draft.size(); i++) {
            InvoiceLineSnapshot current = draft.get(i).line();
            if (current.freeItem()) {
                lines.add(current);
            } else {
                BigDecimal cartShare = cartAllocations.get(i);
                BigDecimal promotion = current.promotionDiscount().add(cartShare).setScale(2);
                BigDecimal total = current.lineTotal().subtract(cartShare).setScale(2);
                if (total.signum() < 0) throw invalid("Cart discount allocation would create a negative invoice line.");
                lines.add(new InvoiceLineSnapshot(current.lineNumber(), current.productId(), current.variantId(),
                        current.productName(), current.variantSize(), current.quantity(), current.unitPrice(),
                        current.bottleId(), current.bottleName(), current.bottlePrice(), promotion,
                        BigDecimal.ZERO.setScale(2), total, false, null));
            }
        }

        BigDecimal shipping = money(order.getShippingCost());
        if (shipping.signum() > 0) {
            lines.add(chargeLine(lineNo++, "Shipping charge", shipping));
        }
        BigDecimal gift = money(order.getGiftServicePrice());
        if (gift.signum() > 0) {
            lines.add(chargeLine(lineNo, "Gift wrapping service", gift));
        }
        BigDecimal subtotal = productGross.add(shipping).add(gift).setScale(2);
        BigDecimal promotion = declaredItemDiscount.add(cartDiscount).setScale(2);
        BigDecimal total = money(order.getTotalAmount());
        BigDecimal reconciled = subtotal.subtract(promotion).setScale(2);
        if (reconciled.compareTo(total) != 0) {
            throw invalid("Saved online invoice totals do not reconcile with the paid order total.");
        }
        return new OrderSnapshot(List.copyOf(lines), subtotal, promotion, total);
    }

    private static InvoiceLineSnapshot chargeLine(int lineNumber, String description, BigDecimal amount) {
        return new InvoiceLineSnapshot(lineNumber, null, null, description, null, 1, amount, null, null,
                BigDecimal.ZERO.setScale(2), BigDecimal.ZERO.setScale(2), BigDecimal.ZERO.setScale(2), amount, false, null);
    }

    private static List<BigDecimal> allocate(BigDecimal amount, List<DraftLine> draft) {
        List<BigDecimal> result = new ArrayList<>(draft.size());
        for (int i = 0; i < draft.size(); i++) result.add(BigDecimal.ZERO.setScale(2));
        long totalCents = cents(amount);
        BigInteger weightTotal = draft.stream().map(line -> BigInteger.valueOf(cents(line.balanceBeforeCartDiscount())))
                .reduce(BigInteger.ZERO, BigInteger::add);
        if (totalCents == 0) return result;
        if (weightTotal.signum() == 0) throw invalid("A cart discount cannot be allocated to a zero-balance order.");
        List<Remainder> remainders = new ArrayList<>();
        long assigned = 0;
        for (int i = 0; i < draft.size(); i++) {
            long weight = cents(draft.get(i).balanceBeforeCartDiscount());
            if (weight == 0) continue;
            BigInteger[] division = BigInteger.valueOf(totalCents).multiply(BigInteger.valueOf(weight))
                    .divideAndRemainder(weightTotal);
            long base = division[0].longValueExact();
            result.set(i, BigDecimal.valueOf(base, 2));
            assigned += base;
            remainders.add(new Remainder(i, division[1]));
        }
        remainders.sort(Comparator.comparing(Remainder::remainder).reversed().thenComparingInt(Remainder::index));
        long centsLeft = totalCents - assigned;
        for (int i = 0; i < centsLeft; i++) {
            int line = remainders.get(i).index();
            result.set(line, result.get(line).add(new BigDecimal("0.01")));
        }
        return result;
    }

    private static BigDecimal money(BigDecimal value) {
        if (value == null) return BigDecimal.ZERO.setScale(2);
        try { return value.setScale(2, RoundingMode.UNNECESSARY); }
        catch (ArithmeticException e) { throw invalid("An online order monetary snapshot has more than two decimals."); }
    }
    private static long cents(BigDecimal value) { return value.movePointRight(2).longValueExact(); }
    private static String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private static String join(String first, String second) {
        return ((first == null ? "" : first.trim()) + " " + (second == null ? "" : second.trim())).trim();
    }
    private static String firstNonBlank(String first, String second) {
        return first != null && !first.isBlank() ? first.trim() : second != null && !second.isBlank() ? second.trim() : null;
    }
    private static IllegalStateException invalid(String reason) { return new IllegalStateException(reason); }

    private record DraftLine(InvoiceLineSnapshot line, BigDecimal balanceBeforeCartDiscount) { }
    private record Remainder(int index, BigInteger remainder) { }
    private record OrderSnapshot(List<InvoiceLineSnapshot> lines, BigDecimal subtotal,
                                 BigDecimal promotionDiscount, BigDecimal total) { }
}
