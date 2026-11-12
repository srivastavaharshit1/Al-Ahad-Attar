package com.alahadattars.billing.delivery;

public class InvoiceDeliveryException extends RuntimeException {
    private final DeliveryFailureKind kind;
    private final String errorCode;

    public InvoiceDeliveryException(DeliveryFailureKind kind, String errorCode, String message) {
        super(message);
        this.kind = kind;
        this.errorCode = errorCode;
    }

    public InvoiceDeliveryException(DeliveryFailureKind kind, String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.kind = kind;
        this.errorCode = errorCode;
    }

    public DeliveryFailureKind kind() {
        return kind;
    }

    public String errorCode() {
        return errorCode;
    }
}
