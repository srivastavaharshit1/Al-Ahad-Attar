package com.alahadattars.util;

public final class AppConstants {
    private AppConstants() {}

    public static final String ROLE_ADMIN = "ROLE_ADMIN";
    public static final String ROLE_USER = "ROLE_USER";

    public static final String PRODUCT_NOT_FOUND_MSG = "Product not found with ID: ";
    public static final String CATEGORY_NOT_FOUND_MSG = "Category not found with ID: ";
    public static final String VARIANT_NOT_FOUND_MSG = "Variant not found with ID: ";
    
    public static final String DEFAULT_SORT_BY = "createdAt";
    public static final String DEFAULT_SORT_DIRECTION = "desc";
    
    public static final String PHONE_REGEX = "^\\+?[0-9]{10,14}$";
}
