package com.alahadattars.service;

import com.alahadattars.dto.profile.AddressRequest;
import com.alahadattars.dto.profile.AddressResponse;

import java.util.List;

public interface AddressService {
    AddressResponse addAddress(String email, AddressRequest request);
    AddressResponse updateAddress(String email, Long id, AddressRequest request);
    AddressResponse getAddressById(String email, Long id);
    List<AddressResponse> getUserAddresses(String email);
    void deleteAddress(String email, Long id);
    AddressResponse setDefaultAddress(String email, Long id);
}
