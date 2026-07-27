package com.alahadattars.dto.homepage;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NewsletterConfigResponse {
    private String title;
    private String subtitle;
    private String buttonText;
    private String successMessage;
}
