package com.alahadattars.migration;

import com.alahadattars.entity.Address;
import com.alahadattars.entity.User;
import com.alahadattars.repository.AddressRepository;
import com.alahadattars.repository.UserRepository;
import com.alahadattars.util.PhoneNumberHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * One-time, idempotent backfill for the phoneCountryCode/phoneNationalNumber columns added
 * alongside the existing `phone` column on User and Address (see PROJECT_REPORT.md). Every row
 * created before this feature landed has `phone` populated but the two new columns null; this
 * runner parses the existing `phone` value and fills them in.
 *
 * Safe to leave running permanently: each run only touches rows where the new columns are still
 * null, so once a database is fully backfilled this becomes a no-op (two cheap "is null" queries)
 * on every subsequent boot. `phone` itself is never modified — existing users/addresses and every
 * code path that reads `phone` are completely unaffected either way.
 */
@Slf4j
@Component
@Order(3)
@RequiredArgsConstructor
public class PhoneNumberBackfillRunner implements CommandLineRunner {

    private final UserRepository userRepository;
    private final AddressRepository addressRepository;

    @Override
    @Transactional
    public void run(String... args) {
        backfillUsers();
        backfillAddresses();
    }

    private void backfillUsers() {
        List<User> pending = userRepository.findByPhoneCountryCodeIsNull();
        if (pending.isEmpty()) {
            return;
        }
        int updated = 0;
        for (User user : pending) {
            PhoneNumberHelper.ParsedPhone parsed = PhoneNumberHelper.parse(user.getPhone());
            if (parsed == null) {
                log.warn("Phone backfill: could not parse existing phone '{}' for user id={} — left as-is.",
                        user.getPhone(), user.getId());
                continue;
            }
            user.setPhoneCountryCode(parsed.regionCode());
            user.setPhoneNationalNumber(parsed.nationalNumber());
            userRepository.save(user);
            updated++;
        }
        log.info("Phone backfill: updated {} of {} pending user row(s).", updated, pending.size());
    }

    private void backfillAddresses() {
        List<Address> pending = addressRepository.findByPhoneCountryCodeIsNull();
        if (pending.isEmpty()) {
            return;
        }
        int updated = 0;
        for (Address address : pending) {
            PhoneNumberHelper.ParsedPhone parsed = PhoneNumberHelper.parse(address.getPhone());
            if (parsed == null) {
                log.warn("Phone backfill: could not parse existing phone '{}' for address id={} — left as-is.",
                        address.getPhone(), address.getId());
                continue;
            }
            address.setPhoneCountryCode(parsed.regionCode());
            address.setPhoneNationalNumber(parsed.nationalNumber());
            addressRepository.save(address);
            updated++;
        }
        log.info("Phone backfill: updated {} of {} pending address row(s).", updated, pending.size());
    }
}
