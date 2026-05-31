-- CreateTable
CREATE TABLE "subscription_orders" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan_id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL DEFAULT 'razorpay',
    "gateway_order_id" TEXT NOT NULL,
    "gateway_payment_id" TEXT,
    "gateway_signature" TEXT,
    "receipt" TEXT,
    "amount_paise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payload" JSONB,
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "paid_at" TIMESTAMPTZ,
    "failed_at" TIMESTAMPTZ,

    CONSTRAINT "subscription_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "gateway" TEXT NOT NULL DEFAULT 'razorpay',
    "gateway_order_id" TEXT,
    "gateway_payment_id" TEXT,
    "amount_paise" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "activated_at" TIMESTAMPTZ,
    "failed_at" TIMESTAMPTZ,
    "failure_reason" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_orders_gateway_order_id_key" ON "subscription_orders"("gateway_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_orders_gateway_payment_id_key" ON "subscription_orders"("gateway_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_orders_receipt_key" ON "subscription_orders"("receipt");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");

-- AddForeignKey
ALTER TABLE "subscription_orders" ADD CONSTRAINT "subscription_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;