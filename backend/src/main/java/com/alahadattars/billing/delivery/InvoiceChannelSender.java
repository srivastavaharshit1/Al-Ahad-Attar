package com.alahadattars.billing.delivery;

import com.alahadattars.billing.invoice.InvoiceListItem;

public interface InvoiceChannelSender {
    InvoiceDeliveryChannel channel();

    boolean isAvailable();

    String send(InvoiceListItem invoice, String destination, byte[] pdf, String deliveryKey);
}
