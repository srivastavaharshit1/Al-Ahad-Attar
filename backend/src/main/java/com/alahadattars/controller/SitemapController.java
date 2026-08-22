package com.alahadattars.controller;

import com.alahadattars.entity.Category;
import com.alahadattars.entity.Product;
import com.alahadattars.repository.CategoryRepository;
import com.alahadattars.repository.ProductRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Sitemap", description = "Dynamic XML Sitemap Generation for SEO")
public class SitemapController {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    private static final String BASE_URL = "https://alahadattars.com";

    @GetMapping(value = "/api/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public String getSitemap() {
        StringBuilder xml = new StringBuilder();
        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");

        // Static Pages
        addUrl(xml, "/", "1.0", "daily");
        addUrl(xml, "/about", "0.8", "monthly");
        addUrl(xml, "/contact", "0.8", "monthly");
        addUrl(xml, "/collection", "0.9", "daily");
        addUrl(xml, "/offers", "0.9", "daily");

        // Dynamic Categories
        List<Category> categories = categoryRepository.findByActiveTrue();
        for (Category category : categories) {
            String catName = category.getName().toLowerCase().replace(" ", "-");
            addUrl(xml, "/collection?category=" + catName, "0.9", "weekly");
        }

        // Dynamic Products
        List<Product> products = productRepository.findByActiveTrue();
        for (Product product : products) {
            addUrl(xml, "/product/" + product.getSlug(), "0.8", "weekly");
        }

        xml.append("</urlset>");
        return xml.toString();
    }

    private void addUrl(StringBuilder xml, String path, String priority, String changefreq) {
        xml.append("  <url>\n");
        xml.append("    <loc>").append(BASE_URL).append(path).append("</loc>\n");
        xml.append("    <changefreq>").append(changefreq).append("</changefreq>\n");
        xml.append("    <priority>").append(priority).append("</priority>\n");
        xml.append("  </url>\n");
    }
}
