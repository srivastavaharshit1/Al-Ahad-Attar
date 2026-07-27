package com.alahadattars.repository;

import com.alahadattars.entity.ReviewReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReviewReportRepository extends JpaRepository<ReviewReport, Long> {
    Page<ReviewReport> findByStatus(com.alahadattars.enums.ReportStatus status, Pageable pageable);
}
