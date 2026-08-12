package com.alahadattars.repository;

import com.alahadattars.entity.Address;
import com.alahadattars.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AddressRepository extends JpaRepository<Address, Long> {
    List<Address> findByUserAndActiveTrue(User user);
    Optional<Address> findByIdAndUserAndActiveTrue(Long id, User user);
    Optional<Address> findByUserAndDefaultAddressTrueAndActiveTrue(User user);
    Optional<Address> findFirstByUserAndActiveTrueOrderByCreatedAtDesc(User user);

    /** Rows created before the phoneCountryCode/phoneNationalNumber columns existed. */
    List<Address> findByPhoneCountryCodeIsNull();
}
