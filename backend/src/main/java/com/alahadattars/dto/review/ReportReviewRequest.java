package com.alahadattars.dto.review;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReportReviewRequest {
    @NotBlank(message = "Reason is required")
    private String reason;
    
    private String comments;
}
