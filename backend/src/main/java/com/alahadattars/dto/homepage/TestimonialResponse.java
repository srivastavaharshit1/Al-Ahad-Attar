package com.alahadattars.dto.homepage;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestimonialResponse {
    private Long id;
    private String customerName;
    private String photoUrl;
    private int rating;
    private String review;
    private int displayOrder;
    private boolean active;
}
