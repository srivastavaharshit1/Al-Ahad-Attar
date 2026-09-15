package com.alahadattars.service;

import com.alahadattars.entity.GuestCheckoutLock;
import com.alahadattars.repository.GuestCheckoutLockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class GuestCheckoutLockService {

    private final GuestCheckoutLockRepository guestCheckoutLockRepository;

    @Transactional(propagation = Propagation.MANDATORY)
    public void acquireLock(String email) {
        if (email == null || email.isBlank()) {
            return;
        }
        
        try {
            GuestCheckoutLock lock = guestCheckoutLockRepository.findByEmailForUpdate(email).orElse(null);
            if (lock == null) {
                lock = new GuestCheckoutLock();
                lock.setEmail(email);
                lock.setLockedAt(LocalDateTime.now());
                guestCheckoutLockRepository.saveAndFlush(lock);
            } else {
                lock.setLockedAt(LocalDateTime.now());
                guestCheckoutLockRepository.saveAndFlush(lock);
            }
        } catch (Exception e) {
            // Concurrent insert race condition. Select for update again.
            log.debug("Concurrent insert for guest lock email {}. Retrying lock acquisition.", email);
            GuestCheckoutLock lock = guestCheckoutLockRepository.findByEmailForUpdate(email)
                    .orElseThrow(() -> new RuntimeException("Failed to acquire guest checkout lock"));
            lock.setLockedAt(LocalDateTime.now());
            guestCheckoutLockRepository.saveAndFlush(lock);
        }
    }
}
