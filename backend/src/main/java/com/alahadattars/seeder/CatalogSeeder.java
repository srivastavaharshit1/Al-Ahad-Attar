package com.alahadattars.seeder;

import com.alahadattars.entity.Address;
import com.alahadattars.entity.Category;
import com.alahadattars.entity.GiftService;
import com.alahadattars.entity.HeroBanner;
import com.alahadattars.entity.Product;
import com.alahadattars.entity.ProductImage;
import com.alahadattars.entity.ProductVariant;
import com.alahadattars.entity.PromoBanner;
import com.alahadattars.entity.Review;
import com.alahadattars.entity.Role;
import com.alahadattars.entity.Testimonial;
import com.alahadattars.entity.User;
import com.alahadattars.entity.WhyChooseUsItem;
import com.alahadattars.enums.CategoryType;
import com.alahadattars.enums.Gender;
import com.alahadattars.enums.ProductType;
import com.alahadattars.enums.RoleType;
import com.alahadattars.repository.AddressRepository;
import com.alahadattars.repository.CategoryRepository;
import com.alahadattars.repository.GiftServiceRepository;
import com.alahadattars.repository.HeroBannerRepository;
import com.alahadattars.repository.ProductImageRepository;
import com.alahadattars.repository.ProductRepository;
import com.alahadattars.repository.ProductVariantRepository;
import com.alahadattars.repository.PromoBannerRepository;
import com.alahadattars.repository.ReviewRepository;
import com.alahadattars.repository.RoleRepository;
import com.alahadattars.repository.TestimonialRepository;
import com.alahadattars.repository.UserRepository;
import com.alahadattars.repository.WhyChooseUsItemRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Seeds a realistic demo product catalog (products, variants, images), two demo customer
 * accounts with addresses and reviews, and homepage content (hero/promo banners, "why choose
 * us" items, testimonials, gift services). Runs once — skipped entirely if products already
 * exist, so it's safe to leave in place across restarts and against a real (non-empty) database.
 */
@Component
@RequiredArgsConstructor
@Order(2)
public class CatalogSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(CatalogSeeder.class);

    // Demo customer accounts (email/password below) are a live, source-visible login the moment
    // this seeder runs. Fine for local dev/demo; an operator seeding a real deployment should set
    // SEED_DEMO_CUSTOMERS=false. Defaults to true to preserve the existing out-of-the-box demo UX.
    @org.springframework.beans.factory.annotation.Value("${app.seed.demo-customers:true}")
    private boolean seedDemoCustomersEnabled;

    private final ProductRepository productRepository;
    private final ProductVariantRepository variantRepository;
    private final ProductImageRepository imageRepository;
    private final CategoryRepository categoryRepository;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final AddressRepository addressRepository;
    private final ReviewRepository reviewRepository;
    private final HeroBannerRepository heroBannerRepository;
    private final PromoBannerRepository promoBannerRepository;
    private final WhyChooseUsItemRepository whyChooseUsItemRepository;
    private final TestimonialRepository testimonialRepository;
    private final GiftServiceRepository giftServiceRepository;
    private final PasswordEncoder passwordEncoder;

    // Every URL below was individually downloaded and visually verified (not just HTTP-200
    // checked) to confirm it (a) actually depicts the described subject and (b) carries no
    // visible third-party brand/logo — Unsplash's perfume-bottle results are dominated by real
    // luxury-brand product photography (Chanel, Versace, etc.), which is not appropriate to
    // display as placeholder imagery for this catalog's own, unrelated fictional brands.
    private static final String[] PERFUME_IMAGES = {
        "https://images.unsplash.com/photo-1622618991746-fe6004db3a47?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1615634260167-c8cdede054de?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1535683577427-740aaac4ec25?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1594125311687-3b1b3eafa9f4?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1615160460524-432433ba1b8f?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1608721279136-cd41b752fa41?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1615160460366-2c9a41771b51?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1621814374283-57cc5d0d39c2?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1608528577891-eb055944f2e7?q=80&w=1000&auto=format&fit=crop",
    };
    private static final String[] ATTAR_IMAGES = {
        "https://images.unsplash.com/photo-1560521166-e4af6324303d?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1608571423539-e951b9b3871e?q=80&w=1000&auto=format&fit=crop",
    };
    private static final String[] BAKHOOR_IMAGES = {
        "https://images.unsplash.com/photo-1512917860049-18d416baa831?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1551690935-a9e6f0a7e788?q=80&w=1000&auto=format&fit=crop",
    };
    private int perfumeIdx = 0;
    private int attarIdx = 0;
    private int bakhoorIdx = 0;

    private String nextImageFor(CategoryType category) {
        return switch (category) {
            case PERFUMES -> PERFUME_IMAGES[perfumeIdx++ % PERFUME_IMAGES.length];
            case ATTARS -> ATTAR_IMAGES[attarIdx++ % ATTAR_IMAGES.length];
            case BAKHOOR -> BAKHOOR_IMAGES[bakhoorIdx++ % BAKHOOR_IMAGES.length];
        };
    }

    /** One row of the product catalog table below. */
    private record ProductSeed(
        String name, String brand, String shortDescription, String description,
        String fragranceFamily, String topNotes, String middleNotes, String baseNotes,
        String longevity, String projection, Gender gender, CategoryType category,
        String subcategory, boolean featured, ProductType variantType, VariantSeed[] variants
    ) {}

    private record VariantSeed(String size, BigDecimal price, int stock) {}

    private static VariantSeed[] attarSizes(int p3, int p6, int p12) {
        return new VariantSeed[]{
            new VariantSeed("3ml", BigDecimal.valueOf(p3), 60),
            new VariantSeed("6ml", BigDecimal.valueOf(p6), 45),
            new VariantSeed("12ml", BigDecimal.valueOf(p12), 30),
        };
    }

    private static VariantSeed[] perfumeSizes(int p30, int p60, int p100) {
        return new VariantSeed[]{
            new VariantSeed("30ml", BigDecimal.valueOf(p30), 40),
            new VariantSeed("60ml", BigDecimal.valueOf(p60), 25),
            new VariantSeed("100ml", BigDecimal.valueOf(p100), 12),
        };
    }

    private static VariantSeed[] bakhoorSizes(int p40, int p100, int p250) {
        return new VariantSeed[]{
            new VariantSeed("40g Box", BigDecimal.valueOf(p40), 50),
            new VariantSeed("100g Box", BigDecimal.valueOf(p100), 30),
            new VariantSeed("250g Jar", BigDecimal.valueOf(p250), 15),
        };
    }

    private List<ProductSeed> catalog() {
        List<ProductSeed> p = new ArrayList<>();

        // ── Attars (concentrated perfume oils) ─────────────────────────────────────────
        p.add(new ProductSeed("Oud Royale", "Sultani Oud House",
            "A regal, smoky oud aged for depth and longevity.",
            "Oud Royale opens with a resinous, smoky oud heart drawn from aged Cambodi wood, softened with a whisper of rose and warmed by amber and musk in the base. Built for cooler evenings and formal occasions, it leaves a trail that lingers for hours.",
            "Woody Oud", "Saffron, Cambodi Oud", "Rose, Cardamom", "Amber, White Musk",
            "8-10 hours", "Strong", Gender.UNISEX, CategoryType.ATTARS, "Oud", true,
            ProductType.ATTAR, attarSizes(699, 1199, 2099)));

        p.add(new ProductSeed("Misk Al Layl (Night Musk)", "Al Ahad Signature",
            "A soft, skin-close white musk for everyday wear.",
            "Night Musk is a clean, powdery white musk blended with a touch of vanilla and sandalwood — the kind of scent that sits close to the skin and is noticed only on an embrace. A staff favourite for daily wear.",
            "Musk", "Bergamot", "White Musk, Vanilla", "Sandalwood, Ambergris",
            "6-8 hours", "Moderate", Gender.UNISEX, CategoryType.ATTARS, "Musk", true,
            ProductType.ATTAR, attarSizes(499, 899, 1599)));

        p.add(new ProductSeed("Gulab-e-Kashmir", "Bait Al Attar",
            "A dewy Kashmiri rose attar, distilled the traditional way.",
            "Steam-distilled from Kashmiri Damask roses using the centuries-old deg-bhapka method, this attar captures the rose at its most fragrant moment — green, dewy, and honeyed, without ever turning cloying.",
            "Floral Rose", "Rose Petals, Green Leaves", "Rose Absolute, Honey", "Sandalwood, Musk",
            "6-8 hours", "Moderate", Gender.FEMALE, CategoryType.ATTARS, "Floral", false,
            ProductType.ATTAR, attarSizes(549, 949, 1699)));

        p.add(new ProductSeed("Zafraan Reserve", "Zafraan Reserve",
            "Saffron and amber layered over a creamy sandalwood base.",
            "A warm, spiced attar built around genuine Kashmiri saffron, layered over creamy Mysore-style sandalwood and finished with a soft amber glow. Rich enough for winter, refined enough for a boardroom.",
            "Oriental Spicy", "Saffron, Pink Pepper", "Sandalwood, Cinnamon", "Amber, Benzoin",
            "8-10 hours", "Strong", Gender.MALE, CategoryType.ATTARS, "Spicy", true,
            ProductType.ATTAR, attarSizes(799, 1399, 2499)));

        p.add(new ProductSeed("Sandal Chandan", "Waha Collection",
            "Pure, creamy Mysore-style sandalwood — nothing else.",
            "A single-note tribute to sandalwood: warm, creamy, and slightly milky, drawn from a Mysore-style base oil. No embellishment needed — this is the attar for purists.",
            "Woody Sandalwood", "Sandalwood", "Sandalwood", "Sandalwood, Musk",
            "6-8 hours", "Moderate", Gender.UNISEX, CategoryType.ATTARS, "Woody", false,
            ProductType.ATTAR, attarSizes(599, 1049, 1849)));

        p.add(new ProductSeed("Amber Nuit", "Qasr Al Oud",
            "A honeyed amber attar with a warm, resinous trail.",
            "Amber Nuit builds a thick, honeyed amber accord over labdanum and vanilla, finished with a trace of oud smoke. Best applied sparingly — a little carries the whole room.",
            "Amber", "Bergamot, Labdanum", "Amber, Vanilla", "Oud, Benzoin",
            "8-10 hours", "Strong", Gender.UNISEX, CategoryType.ATTARS, "Amber", false,
            ProductType.ATTAR, attarSizes(649, 1149, 1999)));

        p.add(new ProductSeed("Yasmin Bloom", "Bait Al Attar",
            "A jasmine-forward floral attar with a green, indolic heart.",
            "Night-blooming jasmine sambac takes centre stage here, tempered with green leaf accords and a soft musk drydown. Romantic without being heavy.",
            "Floral White", "Green Leaves, Bergamot", "Jasmine Sambac", "White Musk, Sandalwood",
            "6-8 hours", "Moderate", Gender.FEMALE, CategoryType.ATTARS, "Floral", false,
            ProductType.ATTAR, attarSizes(549, 949, 1699)));

        p.add(new ProductSeed("Oud Cambodi Extreme", "Sultani Oud House",
            "An uncompromising, barnyard-funk Cambodi oud for connoisseurs.",
            "Not for the faint-hearted — this is oud at its most raw and animalic, sourced from aged Cambodi agarwood. Leathery, smoky, and deeply complex, it rewards patience as it settles over the first hour.",
            "Woody Oud", "Cambodi Oud", "Leather, Smoke", "Musk, Patchouli",
            "10+ hours", "Very Strong", Gender.MALE, CategoryType.ATTARS, "Oud", false,
            ProductType.ATTAR, attarSizes(899, 1599, 2899)));

        p.add(new ProductSeed("Mukhallat Al Ahad", "Al Ahad Signature",
            "The house blend — oud, rose, and saffron in perfect balance.",
            "Our signature mukhallat brings together three of our best-selling notes — Cambodi oud, Kashmiri rose, and saffron — into a single, balanced composition designed to work equally well day or night.",
            "Oriental Woody", "Saffron, Rose", "Oud, Rose Absolute", "Amber, Musk",
            "8-10 hours", "Strong", Gender.UNISEX, CategoryType.ATTARS, "Signature", true,
            ProductType.ATTAR, attarSizes(749, 1299, 2299)));

        p.add(new ProductSeed("Vetiver Al Sharq", "Noor Al Sharq",
            "A dry, earthy vetiver attar with citrus lift.",
            "Vetiver Al Sharq pairs smoky, earthy vetiver root with a citrus top note and a soft musk base — a green, grounded attar built for warm afternoons.",
            "Woody Green", "Bergamot, Petitgrain", "Vetiver", "Musk, Cedarwood",
            "5-7 hours", "Moderate", Gender.MALE, CategoryType.ATTARS, "Woody", false,
            ProductType.ATTAR, attarSizes(549, 949, 1699)));

        p.add(new ProductSeed("Ambergris Marine", "Qasr Al Oud",
            "A luminous, salty-sweet ambergris with a marine edge.",
            "A modern take on the classic ambergris attar, brightened with a faint marine accord and rounded out with white musk — fresher and lighter than a traditional amber.",
            "Amber Fresh", "Marine Accord, Bergamot", "Ambergris", "White Musk, Driftwood",
            "6-8 hours", "Moderate", Gender.UNISEX, CategoryType.ATTARS, "Amber", false,
            ProductType.ATTAR, attarSizes(649, 1149, 1999)));

        p.add(new ProductSeed("Kesar Chandan", "Waha Collection",
            "Saffron-kissed sandalwood, warm and comforting.",
            "A gentler cousin to Zafraan Reserve — saffron threads folded into creamy sandalwood, with none of the heavier spice notes. An easy, everyday warmth.",
            "Woody Spicy", "Saffron", "Sandalwood, Cardamom", "Musk, Vanilla",
            "6-8 hours", "Moderate", Gender.UNISEX, CategoryType.ATTARS, "Woody", false,
            ProductType.ATTAR, attarSizes(599, 1049, 1849)));

        p.add(new ProductSeed("Bahar-e-Gulshan (Garden Bloom)", "Bait Al Attar",
            "A multi-floral bouquet — rose, jasmine, and lily of the valley.",
            "A classic Lucknowi-style gulshan blend layering rose, jasmine, and lily of the valley over a soft musk base — a garden captured in a single bottle.",
            "Floral Bouquet", "Lily of the Valley", "Rose, Jasmine", "White Musk",
            "5-7 hours", "Moderate", Gender.FEMALE, CategoryType.ATTARS, "Floral", false,
            ProductType.ATTAR, attarSizes(549, 949, 1699)));

        p.add(new ProductSeed("Dahn Al Oud Mubakhar", "Sultani Oud House",
            "Smoked oud oil, distilled over bakhoor embers.",
            "Traditionally distilled with the agarwood chips passed over smouldering bakhoor before extraction, giving this oil a deep, incense-like smokiness rarely found outside the Gulf.",
            "Smoky Oud", "Smoke, Cambodi Oud", "Incense, Leather", "Amber, Musk",
            "10+ hours", "Very Strong", Gender.MALE, CategoryType.ATTARS, "Oud", false,
            ProductType.ATTAR, attarSizes(999, 1799, 3199)));

        p.add(new ProductSeed("Rehan Al Malaki (Royal Basil)", "Noor Al Sharq",
            "A sharp, herbal basil-mint attar for warm days.",
            "An unusually fresh entry in our attar line — sweet basil and spearmint over a light musk base, worn for its cooling effect in the Gulf heat.",
            "Fresh Herbal", "Spearmint, Basil", "Green Tea", "White Musk",
            "4-6 hours", "Light", Gender.UNISEX, CategoryType.ATTARS, "Fresh", false,
            ProductType.ATTAR, attarSizes(449, 799, 1399)));

        // ── Bakhoor (incense) ────────────────────────────────────────────────────────
        p.add(new ProductSeed("Royal Oud Bakhoor", "Sultani Oud House",
            "Hand-rolled agarwood chips soaked in oud and rose oil.",
            "Premium agarwood wood chips hand-soaked in a blend of Cambodi oud oil and rose, then air-dried. Burn a single chip on charcoal for a rich, room-filling smoke that lingers on fabric for days.",
            "Woody Oud", "Rose", "Oud Smoke", "Amber, Musk",
            "Long-lasting scent throw", "Strong", Gender.UNISEX, CategoryType.BAKHOOR, "BAKHOOR", true,
            ProductType.ATTAR, bakhoorSizes(399, 799, 1699)));

        p.add(new ProductSeed("Mamool Bakhoor", "Al Ahad Signature",
            "Classic compressed bakhoor blocks — sandalwood and amber.",
            "Our everyday bakhoor, compressed into easy-to-burn blocks from sandalwood powder, amber resin, and a touch of musk. A gentler, more affordable alternative to soaked wood chips.",
            "Woody Amber", "Sandalwood", "Amber", "Musk, Benzoin",
            "Long-lasting scent throw", "Moderate", Gender.UNISEX, CategoryType.BAKHOOR, "BAKHOOR", false,
            ProductType.ATTAR, bakhoorSizes(299, 599, 1249)));

        p.add(new ProductSeed("Mukhallat Bakhoor Deluxe", "Bait Al Attar",
            "A layered bakhoor blend of rose, oud, and saffron.",
            "Three of our signature attars — rose, oud, and saffron — soaked into agarwood chips for a bakhoor that mirrors our best-selling mukhallat in smoke form.",
            "Oriental Woody", "Saffron, Rose", "Oud", "Amber, Musk",
            "Long-lasting scent throw", "Strong", Gender.UNISEX, CategoryType.BAKHOOR, "BAKHOOR", false,
            ProductType.ATTAR, bakhoorSizes(449, 899, 1899)));

        p.add(new ProductSeed("Musk Bakhoor", "Waha Collection",
            "A soft, powdery white musk bakhoor for daily use.",
            "Lighter than our oud-forward blends, this white musk bakhoor is designed for daily home use — clean, powdery, and never overpowering, even in smaller rooms.",
            "Musk", "White Musk", "Vanilla", "Sandalwood",
            "Moderate scent throw", "Light", Gender.UNISEX, CategoryType.BAKHOOR, "BAKHOOR", false,
            ProductType.ATTAR, bakhoorSizes(279, 549, 1149)));

        p.add(new ProductSeed("Frankincense & Myrrh Bakhoor", "Qasr Al Oud",
            "A resinous, ceremonial blend of pure frankincense and myrrh.",
            "Whole frankincense and myrrh resin tears, unblended, for a bakhoor closer to pure incense than a perfumed one — traditionally burned for gatherings and celebrations.",
            "Resinous", "Frankincense", "Myrrh", "Benzoin",
            "Long-lasting scent throw", "Strong", Gender.UNISEX, CategoryType.BAKHOOR, "BAKHOOR", false,
            ProductType.ATTAR, bakhoorSizes(349, 699, 1449)));

        p.add(new ProductSeed("Al Ahad Car Diffuser — Oud", "Al Ahad Signature",
            "A clip-on car diffuser with our signature oud blend.",
            "A vent-clip diffuser pre-loaded with our Oud Royale attar oil in a slow-release gel — no flame, no smoke, just a steady scent for the commute. Refill cartridges sold separately.",
            "Woody Oud", "Saffron", "Oud", "Amber, Musk",
            "2-3 weeks per cartridge", "Moderate", Gender.UNISEX, CategoryType.BAKHOOR, "FRESHENERS", true,
            ProductType.ATTAR, bakhoorSizes(249, 449, 799)));

        p.add(new ProductSeed("Al Ahad Car Diffuser — Rose Musk", "Al Ahad Signature",
            "A clip-on car diffuser with rose and white musk.",
            "The same slow-release vent-clip format as our Oud car diffuser, loaded instead with a soft rose-musk blend — a lighter, fresher option for daily driving.",
            "Floral Musk", "Rose", "White Musk", "Sandalwood",
            "2-3 weeks per cartridge", "Light", Gender.UNISEX, CategoryType.BAKHOOR, "FRESHENERS", false,
            ProductType.ATTAR, bakhoorSizes(249, 449, 799)));

        p.add(new ProductSeed("Sandal Bakhoor Chips", "Waha Collection",
            "Raw sandalwood chips for slow, low-smoke burning.",
            "Unblended sandalwood wood chips, coarsely cut for a slower, cooler burn than our soaked blends — favoured for meditation and quiet evenings.",
            "Woody Sandalwood", "Sandalwood", "Sandalwood", "Sandalwood",
            "Moderate scent throw", "Light", Gender.UNISEX, CategoryType.BAKHOOR, "BAKHOOR", false,
            ProductType.ATTAR, bakhoorSizes(329, 649, 1349)));

        p.add(new ProductSeed("Amber Oud Bakhoor Deluxe", "Sultani Oud House",
            "Our richest bakhoor — heavily soaked in oud, amber, and musk.",
            "The deepest blend in our bakhoor line: agarwood chips triple-soaked in oud oil, amber, and musk over several weeks for maximum scent retention. A little goes a long way.",
            "Woody Amber", "Oud", "Amber, Labdanum", "Musk, Vanilla",
            "Long-lasting scent throw", "Very Strong", Gender.UNISEX, CategoryType.BAKHOOR, "BAKHOOR", false,
            ProductType.ATTAR, bakhoorSizes(499, 999, 2099)));

        p.add(new ProductSeed("Al Ahad Car Diffuser — Amber", "Al Ahad Signature",
            "A clip-on car diffuser with warm amber and vanilla.",
            "A cosy, gourmand-leaning car diffuser blend of amber and vanilla — the warmest option in our car diffuser range, popular through winter months.",
            "Amber Gourmand", "Bergamot", "Amber", "Vanilla, Musk",
            "2-3 weeks per cartridge", "Moderate", Gender.UNISEX, CategoryType.BAKHOOR, "FRESHENERS", false,
            ProductType.ATTAR, bakhoorSizes(249, 449, 799)));

        // ── Perfumes (spray, alcohol-based) ─────────────────────────────────────────────
        p.add(new ProductSeed("Al Ahad Homme Intense", "Al Ahad Signature",
            "A bold, spicy-woody eau de parfum for the modern man.",
            "Our flagship men's fragrance opens with black pepper and bergamot, moves through a spiced leather heart, and settles into a warm sandalwood-and-amber drydown built to last from morning meetings into the evening.",
            "Woody Spicy", "Black Pepper, Bergamot", "Leather, Cardamom", "Sandalwood, Amber",
            "8-10 hours", "Strong", Gender.MALE, CategoryType.PERFUMES, "Signature", true,
            ProductType.PERFUME, perfumeSizes(1499, 2299, 3999)));

        p.add(new ProductSeed("Noor Femme", "Al Ahad Signature",
            "A luminous floral-fruity eau de parfum.",
            "Noor Femme opens bright with pear and pink pepper, blooms into a jasmine-rose heart, and closes on a soft musk-and-vanilla base — designed as an everyday signature scent for women.",
            "Floral Fruity", "Pear, Pink Pepper", "Jasmine, Rose", "Musk, Vanilla",
            "6-8 hours", "Moderate", Gender.FEMALE, CategoryType.PERFUMES, "Signature", true,
            ProductType.PERFUME, perfumeSizes(1499, 2299, 3999)));

        p.add(new ProductSeed("Oud Wood Eau de Parfum", "Sultani Oud House",
            "A refined, wearable oud for those new to the note.",
            "A more approachable oud than our pure attars — smoothed with sandalwood and a touch of vanilla, making it a good entry point for perfume wearers curious about oud.",
            "Woody Oud", "Cardamom, Bergamot", "Oud, Sandalwood", "Vanilla, Amber",
            "6-8 hours", "Moderate", Gender.UNISEX, CategoryType.PERFUMES, "Woody", false,
            ProductType.PERFUME, perfumeSizes(1799, 2699, 4599)));

        p.add(new ProductSeed("Saffron Nights", "Zafraan Reserve",
            "A spiced, seductive eau de parfum for evening wear.",
            "Saffron and rose open into a spiced heart of cinnamon and clove, resting on a base of oud and amber — an evening fragrance built for special occasions.",
            "Oriental Spicy", "Saffron, Rose", "Cinnamon, Clove", "Oud, Amber",
            "8-10 hours", "Strong", Gender.UNISEX, CategoryType.PERFUMES, "Oriental", true,
            ProductType.PERFUME, perfumeSizes(1699, 2599, 4399)));

        p.add(new ProductSeed("Citrus Bloom Cologne", "Noor Al Sharq",
            "A crisp, energising citrus cologne for daytime wear.",
            "A bright blend of bergamot, grapefruit, and neroli over a clean musk base — light enough for the office, refreshing enough for a summer afternoon.",
            "Citrus Fresh", "Bergamot, Grapefruit", "Neroli, Petitgrain", "White Musk",
            "4-6 hours", "Light", Gender.UNISEX, CategoryType.PERFUMES, "Fresh", false,
            ProductType.PERFUME, perfumeSizes(1199, 1799, 2999)));

        p.add(new ProductSeed("Rose Oud Elixir", "Bait Al Attar",
            "A rich rose-oud eau de parfum, deep and long-lasting.",
            "Kashmiri rose and Cambodi oud in a modern alcohol-based format — all the depth of our attar line with the effortless application of a spray.",
            "Floral Woody", "Rose", "Oud", "Musk, Amber",
            "8-10 hours", "Strong", Gender.FEMALE, CategoryType.PERFUMES, "Oriental", false,
            ProductType.PERFUME, perfumeSizes(1799, 2699, 4599)));

        p.add(new ProductSeed("Velvet Amber Nuit", "Qasr Al Oud",
            "A creamy, gourmand amber for cold-weather evenings.",
            "Amber, vanilla, and tonka bean combine into a soft, velvety gourmand that feels almost edible — best worn on cold evenings when you want a scent that hugs.",
            "Amber Gourmand", "Bergamot", "Amber, Tonka Bean", "Vanilla, Musk",
            "8-10 hours", "Strong", Gender.UNISEX, CategoryType.PERFUMES, "Oriental", false,
            ProductType.PERFUME, perfumeSizes(1599, 2399, 4099)));

        p.add(new ProductSeed("Jasmine Sambac EDP", "Bait Al Attar",
            "An intoxicating, indolic jasmine eau de parfum.",
            "Pure jasmine sambac absolute at the heart of this composition, softened with a touch of ylang-ylang and grounded in sandalwood — for those who want jasmine and nothing but.",
            "Floral White", "Ylang-Ylang", "Jasmine Sambac", "Sandalwood, Musk",
            "6-8 hours", "Moderate", Gender.FEMALE, CategoryType.PERFUMES, "Floral", false,
            ProductType.PERFUME, perfumeSizes(1499, 2299, 3999)));

        p.add(new ProductSeed("Leather & Tobacco", "Sultani Oud House",
            "A dark, smoky leather-tobacco eau de parfum.",
            "A confident, masculine composition built around suede leather and dried tobacco leaf, warmed by a whisky-like amber base — worn for its unmistakable character.",
            "Leather Woody", "Bergamot, Pink Pepper", "Leather, Tobacco Leaf", "Amber, Oud",
            "8-10 hours", "Strong", Gender.MALE, CategoryType.PERFUMES, "Woody", false,
            ProductType.PERFUME, perfumeSizes(1699, 2599, 4399)));

        p.add(new ProductSeed("White Musk Eau de Parfum", "Al Ahad Signature",
            "A clean, universally-loved white musk.",
            "The perfume version of our best-selling Misk Al Layl attar — soft, clean, and skin-close, built to be worn every single day without fatigue.",
            "Musk", "Bergamot", "White Musk", "Sandalwood, Vanilla",
            "6-8 hours", "Moderate", Gender.UNISEX, CategoryType.PERFUMES, "Signature", true,
            ProductType.PERFUME, perfumeSizes(1299, 1999, 3399)));

        p.add(new ProductSeed("Vetiver Homme", "Noor Al Sharq",
            "A dry, sophisticated vetiver for daily wear.",
            "A classic men's vetiver, kept dry and earthy with a citrus opening and a soft musk close — understated, versatile, and easy to reach for daily.",
            "Woody Green", "Lemon, Bergamot", "Vetiver", "Musk, Cedarwood",
            "6-8 hours", "Moderate", Gender.MALE, CategoryType.PERFUMES, "Woody", false,
            ProductType.PERFUME, perfumeSizes(1399, 2099, 3599)));

        p.add(new ProductSeed("Gardenia Blanc", "Waha Collection",
            "A creamy, tropical white floral eau de parfum.",
            "Gardenia and tuberose combine into a rich, creamy white floral — tropical and a little decadent, best suited to warm evenings.",
            "Floral White", "Green Leaves", "Gardenia, Tuberose", "Coconut, Musk",
            "6-8 hours", "Moderate", Gender.FEMALE, CategoryType.PERFUMES, "Floral", false,
            ProductType.PERFUME, perfumeSizes(1499, 2299, 3999)));

        p.add(new ProductSeed("Oud Mystique Gift Set", "Sultani Oud House",
            "A curated gift set: Oud Wood EDP, travel attar, and bakhoor sampler.",
            "Our most-gifted bundle — a 50ml Oud Wood Eau de Parfum, a 6ml travel-size Oud Royale attar, and a small tin of Royal Oud Bakhoor chips, presented in a keepsake box.",
            "Woody Oud", "Cardamom, Rose", "Oud, Sandalwood", "Amber, Musk",
            "8-10 hours", "Strong", Gender.UNISEX, CategoryType.PERFUMES, "GIFT_SET", true,
            ProductType.PERFUME, perfumeSizes(2999, 3999, 5999)));

        p.add(new ProductSeed("Rose Garden Gift Set", "Bait Al Attar",
            "A curated gift set: Rose Oud Elixir, Gulab-e-Kashmir attar, and a candle.",
            "A rose-themed gift bundle pairing our Rose Oud Elixir eau de parfum with a 6ml Gulab-e-Kashmir travel attar and a rose-scented candle — presented in a ribboned gift box.",
            "Floral Woody", "Rose", "Rose, Oud", "Musk, Amber",
            "6-8 hours", "Moderate", Gender.FEMALE, CategoryType.PERFUMES, "GIFT_SET", false,
            ProductType.PERFUME, perfumeSizes(2699, 3699, 5499)));

        p.add(new ProductSeed("Amber Discovery Gift Set", "Qasr Al Oud",
            "A three-piece amber discovery set across our attar and perfume lines.",
            "For newcomers to our amber family: a 30ml Velvet Amber Nuit spray, a 6ml Amber Nuit attar, and a Frankincense & Myrrh bakhoor sampler — a complete introduction in one box.",
            "Amber", "Bergamot, Labdanum", "Amber, Tonka Bean", "Vanilla, Benzoin",
            "8-10 hours", "Strong", Gender.UNISEX, CategoryType.PERFUMES, "GIFT_SET", false,
            ProductType.PERFUME, perfumeSizes(2499, 3399, 4999)));

        return p;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (productRepository.count() > 0) {
            log.info("Product catalog already seeded — skipping CatalogSeeder.");
            return;
        }

        log.info("Seeding demo product catalog...");
        Category attars = categoryRepository.findByType(CategoryType.ATTARS).get(0);
        Category bakhoor = categoryRepository.findByType(CategoryType.BAKHOOR).get(0);
        Category perfumes = categoryRepository.findByType(CategoryType.PERFUMES).get(0);

        List<Product> savedProducts = new ArrayList<>();
        int skuCounter = 1000;
        for (ProductSeed s : catalog()) {
            Category category = switch (s.category()) {
                case ATTARS -> attars;
                case BAKHOOR -> bakhoor;
                case PERFUMES -> perfumes;
            };
            String slug = slugify(s.name());

            Product product = Product.builder()
                .name(s.name())
                .slug(slug)
                .shortDescription(s.shortDescription())
                .description(s.description())
                .brand(s.brand())
                .fragranceFamily(s.fragranceFamily())
                .topNotes(s.topNotes())
                .middleNotes(s.middleNotes())
                .baseNotes(s.baseNotes())
                .longevity(s.longevity())
                .projection(s.projection())
                .gender(s.gender())
                .featured(s.featured())
                .active(true)
                .category(category)
                .subcategory(s.subcategory())
                .build();
            product = productRepository.save(product);

            for (VariantSeed v : s.variants()) {
                skuCounter++;
                variantRepository.save(ProductVariant.builder()
                    .product(product)
                    .productType(s.variantType())
                    .size(v.size())
                    .price(v.price())
                    .stock(v.stock())
                    .sku("AA-" + skuCounter + "-" + v.size().replaceAll("[^A-Za-z0-9]", "").toUpperCase())
                    .active(true)
                    .build());
            }

            imageRepository.save(ProductImage.builder()
                .product(product)
                .imageUrl(nextImageFor(s.category()))
                .displayOrder(0)
                .isPrimary(true)
                .altText(s.name())
                .active(true)
                .build());
            imageRepository.save(ProductImage.builder()
                .product(product)
                .imageUrl(nextImageFor(s.category()))
                .displayOrder(1)
                .isPrimary(false)
                .altText(s.name() + " lifestyle")
                .active(true)
                .build());

            savedProducts.add(product);
        }
        log.info("Seeded {} products with variants and images.", savedProducts.size());

        List<User> demoCustomers = seedDemoCustomers();
        seedReviews(savedProducts, demoCustomers);
        seedHomepageContent();
        seedGiftServices();

        log.info("Catalog seeding completed.");
    }

    private String slugify(String name) {
        return name.toLowerCase()
            .replaceAll("[^a-z0-9\\s-]", "")
            .trim()
            .replaceAll("\\s+", "-");
    }

    private List<User> seedDemoCustomers() {
        if (!seedDemoCustomersEnabled) {
            log.warn("SEED_DEMO_CUSTOMERS=false — skipping demo customer accounts (aisha.demo@/imran.demo@alahadattars.com).");
            return new ArrayList<>();
        }

        Role userRole = roleRepository.findByName(RoleType.USER)
            .orElseThrow(() -> new IllegalStateException("USER role must be seeded before CatalogSeeder runs"));

        List<User> customers = new ArrayList<>();

        if (!userRepository.existsByEmail("aisha.demo@alahadattars.com")) {
            User aisha = User.builder()
                .firstName("Aisha")
                .lastName("Khan")
                .email("aisha.demo@alahadattars.com")
                .phone("+919810012345")
                .password(passwordEncoder.encode("Demo@12345"))
                .enabled(true)
                .emailVerified(true)
                .phoneVerified(true)
                .build();
            userRole.addUser(aisha);
            aisha = userRepository.save(aisha);
            addressRepository.save(Address.builder()
                .user(aisha)
                .fullName("Aisha Khan")
                .phone("+919810012345")
                .addressLine1("14 Hazratganj Road")
                .addressLine2("Near City Centre Mall")
                .city("Lucknow")
                .state("Uttar Pradesh")
                .postalCode("226001")
                .country("India")
                .defaultAddress(true)
                .active(true)
                .build());
            customers.add(aisha);
        }

        if (!userRepository.existsByEmail("imran.demo@alahadattars.com")) {
            User imran = User.builder()
                .firstName("Imran")
                .lastName("Siddiqui")
                .email("imran.demo@alahadattars.com")
                .phone("+919810054321")
                .password(passwordEncoder.encode("Demo@12345"))
                .enabled(true)
                .emailVerified(true)
                .phoneVerified(true)
                .build();
            userRole.addUser(imran);
            imran = userRepository.save(imran);
            addressRepository.save(Address.builder()
                .user(imran)
                .fullName("Imran Siddiqui")
                .phone("+919810054321")
                .addressLine1("221B Aminabad Market")
                .city("Lucknow")
                .state("Uttar Pradesh")
                .postalCode("226018")
                .country("India")
                .defaultAddress(true)
                .active(true)
                .build());
            customers.add(imran);
        }

        log.info("Seeded {} demo customer accounts.", customers.size());
        return customers;
    }

    private static final String[][] REVIEW_TEMPLATES = {
        {"Exactly as described", "The scent throw is fantastic and it lasted the whole day. Will definitely reorder."},
        {"Beautiful, authentic scent", "You can tell this is the real thing, not a synthetic knockoff. Packaging was also lovely."},
        {"My new everyday favourite", "Subtle enough for the office but still compliment-worthy. Shipping was quick too."},
        {"Good but a little pricey", "The quality is genuinely excellent, just wish the smaller size was a bit cheaper."},
        {"Long-lasting as promised", "Still noticeable after 8 hours which is rare for me. Very happy with this purchase."},
    };

    private void seedReviews(List<Product> products, List<User> customers) {
        if (customers.isEmpty() || products.isEmpty()) {
            return;
        }
        int reviewed = 0;
        for (int i = 0; i < products.size(); i++) {
            // Review roughly every other product so the catalog has a realistic mix of
            // reviewed and not-yet-reviewed items rather than uniform coverage.
            if (i % 2 != 0) {
                continue;
            }
            Product product = products.get(i);
            User author = customers.get(i % customers.size());
            String[] template = REVIEW_TEMPLATES[i % REVIEW_TEMPLATES.length];
            int rating = 4 + (i % 2); // alternates between 4 and 5 stars

            reviewRepository.save(Review.builder()
                .product(product)
                .user(author)
                .rating(rating)
                .title(template[0])
                .description(template[1])
                .isVerifiedPurchase(true)
                .isHidden(false)
                .build());

            product.setReviewCount(product.getReviewCount() + 1);
            double currentTotal = product.getAverageRating() * (product.getReviewCount() - 1);
            product.setAverageRating((currentTotal + rating) / product.getReviewCount());
            productRepository.save(product);
            reviewed++;
        }
        log.info("Seeded {} product reviews.", reviewed);
    }

    private void seedHomepageContent() {
        if (heroBannerRepository.count() == 0) {
            heroBannerRepository.save(HeroBanner.builder()
                .title("The Art of Fine Perfumery")
                .subtitle("Handcrafted Arabic attars, bakhoor, and perfumes")
                .description("Every drop is distilled the traditional way — rare oud, pure musk, and hand-picked florals, blended for a fragrance that lasts.")
                .buttonText("Discover Collection")
                .buttonUrl("/collections")
                .badge("Luxury Fragrance")
                .imageUrl(nextImageFor(CategoryType.PERFUMES))
                .active(true)
                .displayOrder(0)
                .build());
            heroBannerRepository.save(HeroBanner.builder()
                .title("Signature Oud, Redefined")
                .subtitle("Our best-selling Sultani Oud House collection")
                .description("From smoky Cambodi oud attars to wearable oud eau de parfums — find the strength and format that suits you.")
                .buttonText("Shop Oud Collection")
                .buttonUrl("/collection?family=oud")
                .badge("New")
                .imageUrl(nextImageFor(CategoryType.PERFUMES))
                .active(true)
                .displayOrder(1)
                .build());
            log.info("Seeded 2 hero banners.");
        }

        if (promoBannerRepository.count() == 0) {
            promoBannerRepository.save(PromoBanner.builder()
                .title("Gift Sets Now Available")
                .subtitle("Curated bundles starting at ₹2,499")
                .imageUrl(nextImageFor(CategoryType.PERFUMES))
                .buttonText("Shop Gift Sets")
                .buttonUrl("/collection?subcategory=GIFT_SET")
                .backgroundColor("#121c2a")
                .priority(0)
                .active(true)
                .build());
            promoBannerRepository.save(PromoBanner.builder()
                .title("Free Shipping Above ₹999")
                .subtitle("On every order, every day")
                .imageUrl(nextImageFor(CategoryType.PERFUMES))
                .buttonText("Start Shopping")
                .buttonUrl("/collection")
                .backgroundColor("#d4af37")
                .priority(1)
                .active(true)
                .build());
            promoBannerRepository.save(PromoBanner.builder()
                .title("New: Car Diffuser Range")
                .subtitle("Long-lasting fragrance for your commute")
                .imageUrl(nextImageFor(CategoryType.PERFUMES))
                .buttonText("Shop Car Diffusers")
                .buttonUrl("/collection?subcategory=FRESHENERS")
                .backgroundColor("#5c4033")
                .priority(2)
                .active(true)
                .build());
            log.info("Seeded 3 promo banners.");
        }

        if (whyChooseUsItemRepository.count() == 0) {
            whyChooseUsItemRepository.save(WhyChooseUsItem.builder()
                .icon("verified").title("100% Authentic")
                .description("Every attar is sourced directly from traditional distillers — no synthetic shortcuts.")
                .displayOrder(0).active(true).build());
            whyChooseUsItemRepository.save(WhyChooseUsItem.builder()
                .icon("local_shipping").title("Free Shipping")
                .description("Complimentary delivery across India on orders above ₹999.")
                .displayOrder(1).active(true).build());
            whyChooseUsItemRepository.save(WhyChooseUsItem.builder()
                .icon("redeem").title("Gift-Ready Packaging")
                .description("Every order ships in a signature box, ready to gift without extra wrapping.")
                .displayOrder(2).active(true).build());
            whyChooseUsItemRepository.save(WhyChooseUsItem.builder()
                .icon("support_agent").title("Fragrance Concierge")
                .description("Not sure which scent to pick? Our team replies within a few hours on WhatsApp.")
                .displayOrder(3).active(true).build());
            log.info("Seeded 4 'why choose us' items.");
        }

        if (testimonialRepository.count() == 0) {
            String[][] testimonials = {
                {"Fatima R.", "5", "The Oud Royale attar is unlike anything I've bought locally — deep, smoky, and it lasts the entire day. Worth every rupee."},
                {"Arjun M.", "5", "Ordered the Homme Intense EDP for a wedding and got compliments all night. Packaging felt genuinely premium too."},
                {"Sana K.", "4", "Beautiful rose attar, very true to real Kashmiri rose. Only wish the 3ml bottle lasted a bit longer!"},
                {"Rahul V.", "5", "The car diffuser is honestly the best purchase — subtle, long-lasting, and doesn't give me a headache like the cheap ones."},
                {"Zara A.", "5", "Bought the Rose Garden gift set for my mother and she hasn't stopped talking about it. Will be a regular customer."},
                {"Vikram S.", "4", "Great bakhoor selection, the Frankincense & Myrrh one is now a staple for our evening gatherings."},
            };
            int order = 0;
            for (String[] t : testimonials) {
                testimonialRepository.save(Testimonial.builder()
                    .customerName(t[0])
                    .rating(Integer.parseInt(t[1]))
                    .review(t[2])
                    .displayOrder(order++)
                    .active(true)
                    .build());
            }
            log.info("Seeded {} testimonials.", testimonials.length);
        }
    }

    private void seedGiftServices() {
        if (giftServiceRepository.count() > 0) {
            return;
        }
        giftServiceRepository.save(GiftService.builder()
            .name("Premium Gift Wrapping")
            .description("Your order wrapped in our signature navy-and-gold box with a ribbon and handwritten note.")
            .imageUrl(nextImageFor(CategoryType.PERFUMES))
            .price(BigDecimal.valueOf(99))
            .active(true)
            .sortOrder(0)
            .build());
        giftServiceRepository.save(GiftService.builder()
            .name("Personalised Message Card")
            .description("Add a custom printed message card inside your gift box — perfect for birthdays and anniversaries.")
            .imageUrl(nextImageFor(CategoryType.PERFUMES))
            .price(BigDecimal.valueOf(49))
            .active(true)
            .sortOrder(1)
            .build());
        giftServiceRepository.save(GiftService.builder()
            .name("Express Gift Delivery")
            .description("Guaranteed next-day delivery for gift orders placed before 2 PM, in select cities.")
            .imageUrl(nextImageFor(CategoryType.PERFUMES))
            .price(BigDecimal.valueOf(149))
            .active(true)
            .sortOrder(2)
            .build());
        log.info("Seeded 3 gift services.");
    }
}
