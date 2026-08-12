package com.alahadattars.repository;

import com.alahadattars.entity.Order;
import com.alahadattars.entity.Refund;
import com.alahadattars.enums.RefundStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RefundRepository extends JpaRepository<Refund, Long> {

    List<Refund> findByOrderOrderByCreatedAtDesc(Order order);

    boolean existsByOrderAndStatusIn(Order order, List<RefundStatus> statuses);
}
