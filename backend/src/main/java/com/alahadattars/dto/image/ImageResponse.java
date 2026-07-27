package com.alahadattars.dto.image;

import com.alahadattars.enums.ImageType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImageResponse {
    
    @Schema(description = "ID of the image", example = "1")
    private Long id;
    
    @Schema(description = "ID of the variant this image belongs to", example = "10")
    private Long variantId;
    
    @Schema(description = "Type of the image", example = "THUMBNAIL")
    private ImageType imageType;
    
    @Schema(description = "Original filename when uploaded", example = "front.jpg")
    private String originalFileName;
    
    @Schema(description = "File size in bytes", example = "204800")
    private Long fileSize;
    
    @Schema(description = "MIME content type", example = "image/jpeg")
    private String contentType;
    
    @Schema(description = "Display order for UI", example = "1")
    private Integer displayOrder;
    
    @Schema(description = "URL to access the image", example = "/api/images/1")
    private String url;
}
