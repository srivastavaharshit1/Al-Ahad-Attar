package com.alahadattars;

import com.alahadattars.repository.ProductVariantRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class CheckSizes implements CommandLineRunner {

    private final ProductVariantRepository repository;

    public CheckSizes(ProductVariantRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) throws Exception {
        System.out.println("=== ALL VARIANT SIZES ===");
        repository.findAll().stream()
            .map(v -> v.getSize() + " (" + v.getProductType() + ")")
            .distinct()
            .sorted()
            .forEach(System.out::println);
        System.out.println("=========================");
    }
}
