"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductWithStock, WarehouseWithStock } from "@/types";

interface ProductCardProps {
  product: ProductWithStock;
  onReserved: () => void;
}

export default function ProductCard({ product, onReserved }: ProductCardProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseWithStock | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalAvailable = product.warehouses.reduce((sum, w) => sum + w.available, 0);

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(p);

  const openModal = () => {
    const firstAvailable = product.warehouses.find((w) => w.available > 0);
    setSelectedWarehouse(firstAvailable ?? null);
    setQuantity(1);
    setError(null);
    setModalOpen(true);
  };

  const handleReserve = async () => {
    if (!selectedWarehouse) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          warehouseId: selectedWarehouse.id,
          quantity,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setError(data.error ?? "Not enough stock available");
        onReserved();
        return;
      }

      if (!res.ok) {
        setError(data.error ?? "Reservation failed");
        return;
      }

      localStorage.setItem(`reservation:${data.id}`, JSON.stringify(data));
      setModalOpen(false);
      onReserved();
      router.push(`/reservation/${data.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Product Card */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          boxShadow: "var(--shadow-sm)",
          height: "100%",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-light)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-sm)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
        }}
      >
        {/* Product Image */}
        {product.imageUrl && (
          <div
            style={{
              height: 200,
              overflow: "hidden",
              background: "var(--bg-secondary)",
              position: "relative",
            }}
          >
            <img
              src={product.imageUrl}
              alt={product.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
              }}
            />
            {totalAvailable === 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  background: "var(--red)",
                  color: "#fff",
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Out of Stock
              </div>
            )}
          </div>
        )}

        <div style={{ padding: 24, flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Product Info */}
          <div style={{ marginBottom: 16 }}>
            <h3
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "var(--text)",
                letterSpacing: "-0.02em",
                marginBottom: 6,
                lineHeight: 1.3,
              }}
            >
              {product.name}
            </h3>
            <span
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                fontFamily: "monospace",
                fontWeight: 600,
                letterSpacing: "0.03em",
              }}
            >
              SKU: {product.sku}
            </span>
          </div>

          {/* Description */}
          {product.description && (
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                marginBottom: 20,
              }}
            >
              {product.description}
            </p>
          )}

          {/* Warehouse Stock */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 20,
              flex: 1,
            }}
          >
            {product.warehouses.map((w) => (
              <div
                key={w.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  background: "var(--bg-secondary)",
                  borderRadius: 10,
                  border: "1px solid var(--border-light)",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                    {w.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {w.location}
                  </div>
                </div>
                <StockBadge available={w.available} />
              </div>
            ))}
          </div>

          {/* Price & Action */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              paddingTop: 16,
              borderTop: "1px solid var(--border-light)",
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, fontWeight: 600 }}>
                Price
              </div>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "var(--text)",
                  letterSpacing: "-0.02em",
                }}
              >
                {formatPrice(product.price)}
              </span>
            </div>
            <button
              onClick={openModal}
              disabled={totalAvailable === 0}
              style={{
                padding: "12px 24px",
                background: totalAvailable === 0 ? "var(--border)" : "var(--accent)",
                border: "none",
                borderRadius: 10,
                color: totalAvailable === 0 ? "var(--text-muted)" : "#fff",
                fontWeight: 700,
                fontSize: 14,
                cursor: totalAvailable === 0 ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                letterSpacing: "-0.01em",
                boxShadow: totalAvailable === 0 ? "none" : "0 4px 12px rgba(37, 99, 235, 0.2)",
              }}
              onMouseEnter={(e) => {
                if (totalAvailable > 0) {
                  (e.target as HTMLButtonElement).style.background = "var(--accent-hover)";
                  (e.target as HTMLButtonElement).style.transform = "translateY(-2px)";
                  (e.target as HTMLButtonElement).style.boxShadow = "0 6px 16px rgba(37, 99, 235, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                if (totalAvailable > 0) {
                  (e.target as HTMLButtonElement).style.background = "var(--accent)";
                  (e.target as HTMLButtonElement).style.transform = "translateY(0)";
                  (e.target as HTMLButtonElement).style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.2)";
                }
              }}
            >
              {totalAvailable === 0 ? "Out of Stock" : "Reserve Now"}
            </button>
          </div>
        </div>
      </div>

      {/* Reserve Modal */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div
            className="fade-in"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              width: "100%",
              maxWidth: 500,
              overflow: "hidden",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "24px 28px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--bg-secondary)",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 20,
                    color: "var(--text)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Reserve Product
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, fontWeight: 500 }}>
                  {product.name}
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: 28,
                  lineHeight: 1,
                  padding: 4,
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.color = "var(--text)";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.color = "var(--text-muted)";
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: 28 }}>
              {/* Error */}
              {error && (
                <div
                  style={{
                    padding: "14px 16px",
                    background: "var(--red-dim)",
                    border: "1px solid #fecaca",
                    borderRadius: 12,
                    color: "var(--red)",
                    fontSize: 13,
                    marginBottom: 20,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              {/* Warehouse Selection */}
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--text)",
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  Select Warehouse
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {product.warehouses.map((w) => (
                    <label
                      key={w.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "14px 16px",
                        border: `2px solid ${selectedWarehouse?.id === w.id ? "var(--accent)" : "var(--border)"}`,
                        borderRadius: 12,
                        cursor: w.available > 0 ? "pointer" : "not-allowed",
                        background: selectedWarehouse?.id === w.id ? "var(--accent-light)" : "var(--bg-secondary)",
                        opacity: w.available === 0 ? 0.5 : 1,
                        transition: "all 0.2s",
                      }}
                    >
                      <input
                        type="radio"
                        name="warehouse"
                        value={w.id}
                        disabled={w.available === 0}
                        checked={selectedWarehouse?.id === w.id}
                        onChange={() => {
                          setSelectedWarehouse(w);
                          setQuantity(1);
                          setError(null);
                        }}
                        style={{ accentColor: "var(--accent)", width: 18, height: 18 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                          {w.name}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                          {w.location}
                        </div>
                      </div>
                      <StockBadge available={w.available} />
                    </label>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              {selectedWarehouse && selectedWarehouse.available > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--text)",
                      letterSpacing: "0.03em",
                      textTransform: "uppercase",
                      marginBottom: 12,
                    }}
                  >
                    Quantity
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      style={{
                        width: 40,
                        height: 40,
                        background: "var(--bg-secondary)",
                        border: "2px solid var(--border)",
                        borderRadius: 10,
                        color: "var(--text)",
                        cursor: "pointer",
                        fontSize: 20,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLButtonElement).style.borderColor = "var(--accent)";
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.borderColor = "var(--border)";
                      }}
                    >
                      −
                    </button>
                    <span
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: "var(--text)",
                        minWidth: 40,
                        textAlign: "center",
                      }}
                    >
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(selectedWarehouse.available, q + 1))}
                      style={{
                        width: 40,
                        height: 40,
                        background: "var(--bg-secondary)",
                        border: "2px solid var(--border)",
                        borderRadius: 10,
                        color: "var(--text)",
                        cursor: "pointer",
                        fontSize: 20,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLButtonElement).style.borderColor = "var(--accent)";
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.borderColor = "var(--border)";
                      }}
                    >
                      +
                    </button>
                    <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>
                      of {selectedWarehouse.available} available
                    </span>
                  </div>
                </div>
              )}

              {/* Notice */}
              <div
                style={{
                  padding: "14px 16px",
                  background: "var(--yellow-dim)",
                  borderRadius: 12,
                  fontSize: 13,
                  color: "var(--yellow)",
                  marginBottom: 24,
                  border: "1px solid #fde68a",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                Reservation expires in 10 minutes
              </div>

              {/* Confirm Button */}
              <button
                onClick={handleReserve}
                disabled={!selectedWarehouse || selectedWarehouse.available === 0 || loading}
                style={{
                  width: "100%",
                  padding: "16px 24px",
                  background: loading
                    ? "var(--border)"
                    : !selectedWarehouse || selectedWarehouse.available === 0
                      ? "var(--border)"
                      : "var(--accent)",
                  border: "none",
                  borderRadius: 12,
                  color: !selectedWarehouse || selectedWarehouse.available === 0 ? "var(--text-muted)" : "#fff",
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: !selectedWarehouse || selectedWarehouse.available === 0 || loading ? "not-allowed" : "pointer",
                  letterSpacing: "-0.01em",
                  transition: "all 0.2s",
                  boxShadow: !selectedWarehouse || selectedWarehouse.available === 0 ? "none" : "0 4px 12px rgba(37, 99, 235, 0.3)",
                }}
                onMouseEnter={(e) => {
                  if (selectedWarehouse && selectedWarehouse.available > 0 && !loading) {
                    (e.target as HTMLButtonElement).style.background = "var(--accent-hover)";
                    (e.target as HTMLButtonElement).style.transform = "translateY(-2px)";
                    (e.target as HTMLButtonElement).style.boxShadow = "0 6px 16px rgba(37, 99, 235, 0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedWarehouse && selectedWarehouse.available > 0 && !loading) {
                    (e.target as HTMLButtonElement).style.background = "var(--accent)";
                    (e.target as HTMLButtonElement).style.transform = "translateY(0)";
                    (e.target as HTMLButtonElement).style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.3)";
                  }
                }}
              >
                {loading ? "Reserving..." : `Reserve ${quantity} Unit${quantity > 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StockBadge({ available }: { available: number }) {
  const isOut = available === 0;
  const isLow = available > 0 && available <= 3;

  return (
    <span
      className={isOut ? "badge-out" : isLow ? "badge-low" : "badge-available"}
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: "6px 12px",
        borderRadius: 20,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
      }}
    >
      {isOut ? "Out" : `${available} Left`}
    </span>
  );
}
