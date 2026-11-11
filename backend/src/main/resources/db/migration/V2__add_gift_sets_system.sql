-- V2__add_gift_sets_system.sql
-- Description: Introduces curated Gift Sets tables, image management, historical order snapshot tables, and cart/order mutual exclusivity columns.
-- Note: Strict DDL is used without IF NOT EXISTS to ensure any incompatible pre-existing objects fail visibly.

-- 1. Create gift_set table
CREATE TABLE gift_set (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    sale_price NUMERIC(10, 2),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    packaging_notes TEXT,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_gift_set_price_positive CHECK (price > 0),
    CONSTRAINT chk_gift_set_sale_price_valid CHECK (sale_price IS NULL OR (sale_price > 0 AND sale_price <= price))
);

CREATE INDEX idx_gift_set_slug ON gift_set(slug);
CREATE INDEX idx_gift_set_active ON gift_set(active);
CREATE INDEX idx_gift_set_featured ON gift_set(featured, active);
CREATE INDEX idx_gift_set_display_order ON gift_set(display_order);

-- 2. Create gift_set_item table (components of the bundle)
CREATE TABLE gift_set_item (
    id BIGSERIAL PRIMARY KEY,
    gift_set_id BIGINT NOT NULL REFERENCES gift_set(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES product(id) ON DELETE RESTRICT,
    variant_id BIGINT NOT NULL REFERENCES product_variant(id) ON DELETE RESTRICT,
    quantity INT NOT NULL DEFAULT 1,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_gift_set_item_quantity_positive CHECK (quantity >= 1),
    CONSTRAINT uq_gift_set_item_variant UNIQUE (gift_set_id, variant_id)
);

CREATE INDEX idx_gift_set_item_set_id ON gift_set_item(gift_set_id);
CREATE INDEX idx_gift_set_item_variant_id ON gift_set_item(variant_id);
CREATE INDEX idx_gift_set_item_product_id ON gift_set_item(product_id);

-- 3. Create gift_set_image table
CREATE TABLE gift_set_image (
    id BIGSERIAL PRIMARY KEY,
    gift_set_id BIGINT NOT NULL REFERENCES gift_set(id) ON DELETE CASCADE,
    image_url VARCHAR(1000) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    alt_text VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gift_set_image_set_id ON gift_set_image(gift_set_id);
CREATE INDEX idx_gift_set_image_primary ON gift_set_image(gift_set_id, is_primary);

-- 4. Alter cart_item for gift sets and mutual exclusivity
ALTER TABLE cart_item ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE cart_item ALTER COLUMN variant_id DROP NOT NULL;
ALTER TABLE cart_item ADD COLUMN is_gift_set BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE cart_item ADD COLUMN gift_set_id BIGINT REFERENCES gift_set(id) ON DELETE RESTRICT;

CREATE INDEX idx_cart_item_gift_set_id ON cart_item(gift_set_id);

ALTER TABLE cart_item ADD CONSTRAINT chk_cart_item_type_exclusivity CHECK (
    (is_gift_set = FALSE AND gift_set_id IS NULL AND product_id IS NOT NULL AND variant_id IS NOT NULL) OR
    (is_gift_set = TRUE AND gift_set_id IS NOT NULL AND product_id IS NULL AND variant_id IS NULL AND bottle_id IS NULL)
);

-- 5. Alter order_item for gift sets and mutual exclusivity
ALTER TABLE order_item ALTER COLUMN variant_id DROP NOT NULL;
ALTER TABLE order_item ADD COLUMN is_gift_set BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE order_item ADD COLUMN gift_set_id BIGINT REFERENCES gift_set(id) ON DELETE RESTRICT;
ALTER TABLE order_item ADD COLUMN gift_set_name VARCHAR(255);
ALTER TABLE order_item ADD COLUMN gift_set_snapshot JSONB;

CREATE INDEX idx_order_item_gift_set_id ON order_item(gift_set_id);

ALTER TABLE order_item ADD CONSTRAINT chk_order_item_type_exclusivity CHECK (
    (is_gift_set = FALSE AND gift_set_id IS NULL AND gift_set_name IS NULL AND gift_set_snapshot IS NULL AND variant_id IS NOT NULL) OR
    (is_gift_set = TRUE AND gift_set_id IS NOT NULL AND variant_id IS NULL AND bottle_id IS NULL AND bottle_name IS NULL AND bottle_price IS NULL)
);

-- 6. Create order_item_gift_set_component table (historical snapshot)
-- Note: variant_id and product_id are stored as immutable BIGINT values WITHOUT live catalog FK cascades,
-- guaranteeing that deleting or altering a live catalog variant NEVER sets variant_id to null or destroys historical order snapshots.
CREATE TABLE order_item_gift_set_component (
    id BIGSERIAL PRIMARY KEY,
    order_item_id BIGINT NOT NULL REFERENCES order_item(id) ON DELETE CASCADE,
    gift_set_id BIGINT,
    product_id BIGINT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    variant_id BIGINT NOT NULL,
    variant_size VARCHAR(100) NOT NULL,
    sku VARCHAR(100),
    quantity_per_set INT NOT NULL,
    total_deducted_quantity INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_oigsc_qty_positive CHECK (quantity_per_set >= 1 AND total_deducted_quantity >= 1)
);

CREATE INDEX idx_oigsc_order_item_id ON order_item_gift_set_component(order_item_id);
CREATE INDEX idx_oigsc_variant_id ON order_item_gift_set_component(variant_id);
