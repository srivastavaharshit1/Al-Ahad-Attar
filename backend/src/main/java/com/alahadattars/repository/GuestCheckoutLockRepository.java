package com.alahadattars.repository;

import com.alahadattars.entity.GuestCheckoutLock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import jakarta.persistence.LockModeType;

import java.util.Optional;

@Repository
public interface GuestCheckoutLockRepository extends JpaRepository<GuestCheckoutLock, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT g FROM GuestCheckoutLock g WHERE g.email = :email")
    Optional<GuestCheckoutLock> findByEmailForUpdate(@Param("email") String email);
}
