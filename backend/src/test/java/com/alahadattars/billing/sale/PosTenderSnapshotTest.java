package com.alahadattars.billing.sale;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PosTenderSnapshotTest {
    @Test
    void cashSeparatesPayableReceivedChangeAndApplied() {
        PosTenderSnapshot tender = new PosTenderSnapshot(TenderMethod.CASH,
                new BigDecimal("850.00"), new BigDecimal("1000.00"),
                new BigDecimal("150.00"), new BigDecimal("850.00"), null);

        assertEquals(new BigDecimal("850.00"), tender.amountApplied());
        assertEquals(new BigDecimal("150.00"), tender.changeReturned());
    }

    @Test
    void upiAndCardMustRecordTheAmountActuallyApplied() {
        assertThrows(IllegalArgumentException.class, () -> new PosTenderSnapshot(TenderMethod.UPI,
                new BigDecimal("850.00"), new BigDecimal("900.00"), BigDecimal.ZERO,
                new BigDecimal("850.00"), "upi-ref"));
        PosTenderSnapshot card = new PosTenderSnapshot(TenderMethod.CARD,
                new BigDecimal("850.00"), new BigDecimal("850.00"), BigDecimal.ZERO,
                new BigDecimal("850.00"), "terminal-ref");
        assertEquals("terminal-ref", card.transactionReference());
    }

    @Test
    void rejectsNegativeOrInconsistentCashAndNeverAcceptsCardCredentials() {
        assertThrows(IllegalArgumentException.class, () -> new PosTenderSnapshot(TenderMethod.CASH,
                new BigDecimal("850.00"), new BigDecimal("800.00"), BigDecimal.ZERO,
                new BigDecimal("850.00"), null));
        assertThrows(IllegalArgumentException.class, () -> new PosTenderSnapshot(TenderMethod.CASH,
                new BigDecimal("850.00"), new BigDecimal("1000.00"), new BigDecimal("100.00"),
                new BigDecimal("850.00"), null));
    }
}
