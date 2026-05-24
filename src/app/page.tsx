"use client";

import { useEffect, useState, useCallback } from "react";
import ProductCard from "@/components/ProductCard";
import type { ProductWithStock } from "@/types";

export default function HomePage() {
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load products");
      const data = await res.json();
      setProducts(data);
      setLastRefreshed(new Date());
      setError(null);
    } catch {
      setError("Could not load products. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    const interval = setInterval(fetchProducts, 30_000);
    return () => clearInterval(interval);
  }, [fetchProducts]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Header */}
      <header
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          position: "sticky",
          top: 0,
          zIndex: 100,
          backdropFilter: "blur(8px)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "0 32px",
            height: 72,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 40,
                height: 40,
                background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 18,
                  color: "var(--text)",
                  letterSpacing: "-0.02em",
                }}
              >
                Allo Inventory
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                }}
              >
                Multi-Warehouse Platform
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                color: "var(--text-secondary)",
                fontWeight: 500,
              }}
            >
              <div
                className="pulse-dot"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--green)",
                  boxShadow: "0 0 0 3px var(--green-dim)",
                }}
              />
              Live Inventory
            </div>
            <button
              onClick={fetchProducts}
              style={{
                padding: "8px 16px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text-secondary)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.borderColor = "var(--accent)";
                (e.target as HTMLButtonElement).style.color = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.borderColor = "var(--border)";
                (e.target as HTMLButtonElement).style.color = "var(--text-secondary)";
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 32px" }}>
        {/* Page Header */}
        <div style={{ marginBottom: 40 }}>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: "var(--text)",
              letterSpacing: "-0.03em",
              marginBottom: 12,
            }}
          >
            Product Catalogue
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 15, fontWeight: 500 }}>
            {loading
              ? "Loading products..."
              : `${products.length} products available across Chennai, Bengaluru, and Delhi · Updated ${lastRefreshed.toLocaleTimeString()}`}
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div
            className="fade-in"
            style={{
              padding: "16px 20px",
              background: "var(--red-dim)",
              border: "1px solid #fecaca",
              borderRadius: 12,
              color: "var(--red)",
              marginBottom: 32,
              fontSize: 14,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
              gap: 24,
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                  padding: 24,
                  height: 320,
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div className="skeleton" style={{ height: 20, width: "70%", marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 14, width: "90%", marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 14, width: "60%", marginBottom: 28 }} />
                <div className="skeleton" style={{ height: 100, marginBottom: 20 }} />
                <div className="skeleton" style={{ height: 44 }} />
              </div>
            ))}
          </div>
        )}

        {/* Product Grid */}
        {!loading && !error && products.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
              gap: 24,
            }}
          >
            {products.map((product, i) => (
              <div
                key={product.id}
                className="fade-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <ProductCard product={product} onReserved={fetchProducts} />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && products.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "100px 0",
              color: "var(--text-muted)",
            }}
          >
            <div style={{ fontSize: 64, marginBottom: 20 }}>📦</div>
            <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No products found</p>
            <p style={{ fontSize: 14, marginTop: 12 }}>
              Run{" "}
              <code
                style={{
                  fontFamily: "monospace",
                  background: "var(--surface)",
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  fontWeight: 600,
                }}
              >
                npm run db:seed
              </code>{" "}
              to populate the database
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
