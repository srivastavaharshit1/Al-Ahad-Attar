package com.alahadattars.enums;

/**
 * The three curated product-carousel sections on the homepage.
 * Each section has a fixed eligibility rule enforced at the service layer:
 *
 *  ATTARS               — any product in a category with type=ATTARS
 *  PERFUMES_BAKHOOR     — any product in PERFUMES or BAKHOOR category,
 *                         excluding products whose subcategory is "Car Perfumes"
 *  CAR_PERFUMES_INCENSE — products whose subcategory is "Car Perfumes"
 *                         OR any product in a BAKHOOR category
 *                         (covers incense sticks that share the BAKHOOR category type)
 */
public enum HomepageProductSection {
    ATTARS,
    PERFUMES_BAKHOOR,
    CAR_PERFUMES_INCENSE
}
