package com.alahadattars.repository;

import com.alahadattars.entity.BulkPriceAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BulkPriceAuditRepository extends JpaRepository<BulkPriceAudit, Long> {
    boolean existsByIdempotencyKey(String idempotencyKey);
}
