package com.alahadattars.dto.homepage;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromoBannerRequest {
    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    @Size(max = 255, message = "Subtitle must not exceed 255 characters")
    private String subtitle;
    private String buttonText;
    private String buttonUrl;
    private String backgroundColor;
    @NotNull(message = "Priority is required")
    private Integer priority;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private boolean active;
}
