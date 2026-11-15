package com.alahadattars.repository;

import com.alahadattars.entity.Bottle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BottleRepository extends JpaRepository<Bottle, Long> {
    List<Bottle> findByActiveTrue();
    List<Bottle> findByActiveTrueAndApplicabilityIn(List<com.alahadattars.enums.BottleApplicability> applicabilities);

    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
    @org.springframework.data.jpa.repository.Query(value = "UPDATE bottle SET stock_quantity = stock_quantity - :quantity WHERE id = :id AND stock_quantity >= :quantity", nativeQuery = true)
    int decrementStock(@org.springframework.data.repository.query.Param("id") Long id, @org.springframework.data.repository.query.Param("quantity") int quantity);

    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
    @org.springframework.data.jpa.repository.Query(value = "UPDATE bottle SET stock_quantity = stock_quantity + :quantity WHERE id = :id", nativeQuery = true)
    int incrementStock(@org.springframework.data.repository.query.Param("id") Long id, @org.springframework.data.repository.query.Param("quantity") int quantity);
}
