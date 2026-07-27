package com.alahadattars.dto.homepage;

import com.alahadattars.dto.category.CategoryResponse;
import com.alahadattars.dto.product.ProductSummaryResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HomepageDataResponse {
    private List<HomepageSectionResponse> sections;
    private List<HeroBannerResponse> heroes;
    private List<PromoBannerResponse> promoBanners;
    private List<CategoryResponse> categories;
    private List<ProductSummaryResponse> featuredProducts;
    private List<TestimonialResponse> testimonials;
    private List<WhyChooseUsItemResponse> whyChooseUsItems;
    private NewsletterConfigResponse newsletterConfig;
}
