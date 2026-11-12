package com.alahadattars.billing.online;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.SmartLifecycle;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/** Opt-in DB poller; it never changes order, payment, refund, checkout, or webhook state. */
@Slf4j
@Component
public class OnlineInvoiceGenerationWorker implements SmartLifecycle {
    private final OnlineInvoiceJobJdbcRepository jobs;
    private final OnlineInvoiceGenerationService generation;
    private final boolean enabled;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private ScheduledExecutorService executor;

    public OnlineInvoiceGenerationWorker(OnlineInvoiceJobJdbcRepository jobs,
                                         OnlineInvoiceGenerationService generation,
                                         @Value("${billing.online-invoice.worker.enabled:false}") boolean enabled) {
        this.jobs = jobs;
        this.generation = generation;
        this.enabled = enabled;
    }

    @Override
    public synchronized void start() {
        if (!enabled || !running.compareAndSet(false, true)) return;
        executor = Executors.newSingleThreadScheduledExecutor(task -> {
            Thread thread = new Thread(task, "billing-online-invoice-worker");
            thread.setDaemon(true);
            return thread;
        });
        executor.scheduleWithFixedDelay(this::poll, 0, 10, TimeUnit.SECONDS);
    }

    private void poll() {
        try {
            jobs.discoverEligibleOrders(100);
            for (OnlineInvoiceJob job : jobs.claimDue(20)) {
                try {
                    generation.process(job);
                } catch (OnlineInvoiceConfigurationUnavailableException blocked) {
                    jobs.fail(job, "INVOICE_CONFIGURATION_UNAVAILABLE", blocked.getMessage(),
                            Instant.now().plusSeconds(3600), true);
                    log.warn("Online invoice job {} is blocked by missing approved configuration", job.id());
                } catch (RuntimeException failure) {
                    int exponent = Math.min(Math.max(job.attemptNumber() - 1, 0), 10);
                    long delaySeconds = Math.min(30L * (1L << exponent), 21_600L);
                    jobs.fail(job, "ONLINE_INVOICE_GENERATION_FAILED",
                            "Invoice generation failed; inspect restricted worker diagnostics.",
                            job.attemptNumber() >= OnlineInvoiceJobJdbcRepository.MAX_ATTEMPTS
                                    ? null : Instant.now().plusSeconds(delaySeconds), false);
                    log.error("Online invoice generation failed for job {} (attempt {}) [{}]",
                            job.id(), job.attemptNumber(), failure.getClass().getSimpleName());
                }
            }
        } catch (RuntimeException failure) {
            log.error("Online invoice worker poll failed; paid orders remain discoverable for recovery [{}]",
                    failure.getClass().getSimpleName());
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
    @Override public void stop(Runnable callback) { stop(); callback.run(); }
    @Override public boolean isRunning() { return running.get(); }
    @Override public boolean isAutoStartup() { return true; }
    @Override public int getPhase() { return Integer.MAX_VALUE - 90; }
}
