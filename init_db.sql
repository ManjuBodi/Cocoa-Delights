-- Enable UUID extension for generating primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS Users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL CHECK (email ~* '^[A-Za-z0-9._+%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS Products (
    product_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Orders Table
CREATE TABLE IF NOT EXISTS Orders (
    order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES Users(user_id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Order_Items Table
CREATE TABLE IF NOT EXISTS Order_Items (
    order_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES Orders(order_id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES Products(product_id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    -- Ensure a product is only added once per order (quantity should be updated instead)
    UNIQUE (order_id, product_id)
);

-- Create indexes for performance on foreign keys and commonly searched fields
CREATE INDEX IF NOT EXISTS idx_users_email ON Users(email);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON Orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON Order_Items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON Order_Items(product_id);

-- 5. Trigger for ACID Compliant Inventory Management
-- Function to deduct inventory when an order item is added
CREATE OR REPLACE FUNCTION deduct_inventory_on_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Deduct the quantity from the products table
    UPDATE Products
    SET stock_quantity = stock_quantity - NEW.quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE product_id = NEW.product_id;

    -- Note: The CHECK (stock_quantity >= 0) constraint on Products 
    -- will automatically fail and rollback the transaction if stock is insufficient.

    -- Update the order's total amount
    UPDATE Orders
    SET total_amount = total_amount + (NEW.quantity * NEW.unit_price),
        updated_at = CURRENT_TIMESTAMP
    WHERE order_id = NEW.order_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to execute the function AFTER INSERT on Order_Items
CREATE TRIGGER trigger_deduct_inventory
AFTER INSERT ON Order_Items
FOR EACH ROW
EXECUTE FUNCTION deduct_inventory_on_order();
