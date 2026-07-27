package com.alahadattars.dto;

import com.alahadattars.enums.MessageStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContactMessageResponse {
    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private String inquiryType;
    private String message;
    private MessageStatus status;
    private LocalDateTime createdAt;
}
