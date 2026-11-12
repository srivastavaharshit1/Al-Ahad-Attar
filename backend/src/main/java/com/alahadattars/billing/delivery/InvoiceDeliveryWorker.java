package com.alahadattars.billing.delivery;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.SmartLifecycle;
import org.springframework.stereotype.Component;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/** Separate opt-in worker; does not enable Spring's global @Scheduled processing. */
@Slf4j
@Component
public class InvoiceDeliveryWorker implements SmartLifecycle {
    private final InvoiceDeliveryService deliveryService;
    private final boolean enabled;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private ScheduledExecutorService executor;

    public InvoiceDeliveryWorker(
            InvoiceDeliveryService deliveryService,
            @Value("${billing.delivery.worker.enabled:false}") boolean enabled) {
        this.deliveryService = deliveryService;
        this.enabled = enabled;
    }

    @Override
    public synchronized void start() {
        if (!enabled || !running.compareAndSet(false, true)) {
            return;
        }
        executor = Executors.newSingleThreadScheduledExecutor(task -> {
            Thread thread = new Thread(task, "billing-invoice-delivery-worker");
            thread.setDaemon(true);
            return thread;
        });
        executor.scheduleWithFixedDelay(this::poll, 0, 5, TimeUnit.SECONDS);
    }

    private void poll() {
        try {
            deliveryService.processDueDeliveries(20);
        } catch (RuntimeException failure) {
            log.error("Billing invoice delivery batch failed; durable queue rows remain available for recovery", failure);
        }
    }

    @Override
    public synchronized void stop() {
        running.set(false);
        if (executor != null) {
            executor.shutdown();
            executor = null;
        }
    }

    @Override
    public void stop(Runnable callback) {
        stop();
        callback.run();
    }

    @Override
    public boolean isRunning() {
        return running.get();
    }

    @Override
    public boolean isAutoStartup() {
        return true;
    }

    @Override
    public int getPhase() {
        return Integer.MAX_VALUE - 100;
    }
}
