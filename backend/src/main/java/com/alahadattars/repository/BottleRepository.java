package com.alahadattars.repository;

import com.alahadattars.entity.Bottle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BottleRepository extends JpaRepository<Bottle, Long> {
    List<Bottle> findByActiveTrue();
    List<Bottle> findByActiveTrueAndApplicabilityIn(List<com.alahadattars.enums.BottleApplicability> applicabilities);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Bottle b SET b.stockQuantity = b.stockQuantity - :quantity WHERE b.id = :id AND b.stockQuantity >= :quantity")
    int decrementStock(@org.springframework.data.repository.query.Param("id") Long id, @org.springframework.data.repository.query.Param("quantity") int quantity);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Bottle b SET b.stockQuantity = b.stockQuantity + :quantity WHERE b.id = :id")
    int incrementStock(@org.springframework.data.repository.query.Param("id") Long id, @org.springframework.data.repository.query.Param("quantity") int quantity);
}
