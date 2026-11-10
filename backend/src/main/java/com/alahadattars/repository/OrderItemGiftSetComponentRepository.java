package com.alahadattars.repository;

import com.alahadattars.entity.OrderItem;
import com.alahadattars.entity.OrderItemGiftSetComponent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderItemGiftSetComponentRepository extends JpaRepository<OrderItemGiftSetComponent, Long> {

    List<OrderItemGiftSetComponent> findByOrderItem(OrderItem orderItem);

    List<OrderItemGiftSetComponent> findByOrderItemId(Long orderItemId);
}

