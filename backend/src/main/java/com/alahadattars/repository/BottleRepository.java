package com.alahadattars.repository;

import com.alahadattars.entity.Bottle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BottleRepository extends JpaRepository<Bottle, Long> {
    List<Bottle> findByActiveTrue();
}
