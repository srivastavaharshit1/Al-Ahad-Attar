package com.alahadattars.service.impl;

import com.alahadattars.dto.profile.AddressRequest;
import com.alahadattars.dto.profile.AddressResponse;
import com.alahadattars.entity.Address;
import com.alahadattars.entity.User;
import com.alahadattars.exception.ResourceNotFoundException;
import com.alahadattars.mapper.AddressMapper;
import com.alahadattars.repository.AddressRepository;
import com.alahadattars.repository.UserRepository;
import com.alahadattars.service.AddressService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AddressServiceImpl implements AddressService {

    private final AddressRepository addressRepository;
    private final UserRepository userRepository;
    private final AddressMapper addressMapper;

    @Override
    @Transactional
    public AddressResponse addAddress(String email, AddressRequest request) {
        User user = getUserByEmail(email);

        Address address = addressMapper.toEntity(request);
        address.setUser(user);

        if (request.isDefaultAddress()) {
            clearCurrentDefaultAddress(user);
        } else {
            // If this is the user's first address, make it default automatically
            long activeCount = addressRepository.findByUserAndActiveTrue(user).size();
            if (activeCount == 0) {
                address.setDefaultAddress(true);
            }
        }

        Address savedAddress = addressRepository.save(address);
        log.info("Added new address for user {}: ID={}", email, savedAddress.getId());
        return addressMapper.toResponse(savedAddress);
    }

    @Override
    @Transactional
    public AddressResponse updateAddress(String email, Long id, AddressRequest request) {
        User user = getUserByEmail(email);
        Address address = getAddressEntity(id, user);

        address.setFullName(request.getFullName());
        address.setPhone(request.getPhone());
        address.setAddressLine1(request.getAddressLine1());
        address.setAddressLine2(request.getAddressLine2());
        address.setLandmark(request.getLandmark());
        address.setCity(request.getCity());
        address.setState(request.getState());
        address.setPostalCode(request.getPostalCode());
        address.setCountry(request.getCountry());

        if (request.isDefaultAddress() && !address.isDefaultAddress()) {
            clearCurrentDefaultAddress(user);
            address.setDefaultAddress(true);
        } else if (!request.isDefaultAddress() && address.isDefaultAddress()) {
            address.setDefaultAddress(false);
            // Assign another default if possible
            assignFallbackDefault(user, id);
        }

        Address savedAddress = addressRepository.save(address);
        log.info("Updated address for user {}: ID={}", email, savedAddress.getId());
        return addressMapper.toResponse(savedAddress);
    }

    @Override
    public AddressResponse getAddressById(String email, Long id) {
        User user = getUserByEmail(email);
        return addressMapper.toResponse(getAddressEntity(id, user));
    }

    @Override
    public List<AddressResponse> getUserAddresses(String email) {
        User user = getUserByEmail(email);
        return addressRepository.findByUserAndActiveTrue(user).stream()
                .map(addressMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteAddress(String email, Long id) {
        User user = getUserByEmail(email);
        Address address = getAddressEntity(id, user);

        address.setActive(false);
        if (address.isDefaultAddress()) {
            address.setDefaultAddress(false);
            assignFallbackDefault(user, id);
        }

        addressRepository.save(address);
        log.info("Deleted (deactivated) address for user {}: ID={}", email, id);
    }

    @Override
    @Transactional
    public AddressResponse setDefaultAddress(String email, Long id) {
        User user = getUserByEmail(email);
        Address address = getAddressEntity(id, user);

        if (!address.isDefaultAddress()) {
            clearCurrentDefaultAddress(user);
            address.setDefaultAddress(true);
            addressRepository.save(address);
            log.info("Set address ID={} as default for user {}", id, email);
        }

        return addressMapper.toResponse(address);
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Address getAddressEntity(Long id, User user) {
        return addressRepository.findByIdAndUserAndActiveTrue(id, user)
                .orElseThrow(() -> new ResourceNotFoundException("Address not found or access denied"));
    }

    private void clearCurrentDefaultAddress(User user) {
        addressRepository.findByUserAndDefaultAddressTrueAndActiveTrue(user)
                .ifPresent(existingDefault -> {
                    existingDefault.setDefaultAddress(false);
                    addressRepository.save(existingDefault);
                });
    }

    private void assignFallbackDefault(User user, Long excludedAddressId) {
        List<Address> addresses = addressRepository.findByUserAndActiveTrue(user);
        for (Address address : addresses) {
            if (!address.getId().equals(excludedAddressId)) {
                address.setDefaultAddress(true);
                addressRepository.save(address);
                log.info("Assigned fallback default address ID={} for user ID={}", address.getId(), user.getId());
                break;
            }
        }
    }
}
