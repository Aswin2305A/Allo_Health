"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReservationTimer from "@/components/ReservationTimer";
import type { ReservationWithDetails } from "@/types";

export default function ReservationPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [reservation, setReservation] =
    useState<ReservationWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<
    "confirm" | "cancel" | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchReservation = useCallback(async () => {
    try {
      // We fetch the reservation directly — in a real app there'd be a GET endpoint
      // For now we reconstruct from localStorage (stored when created)
      const cached = localStorage.getItem(`reservation:${params.id}`);
      if (cached) {
        setReservation(JSON.parse(cached));
      }
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchReservation();
  }, [fetchReservation]);

  const handleConfirm = async () => {
    if (!reservation) return;
    setActionLoading("confirm");
    setActionError(null);

    try {
      const res = await fetch(`/api/reservations/${reservation.id}/confirm`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.status === 410) {
        setActionError(
          "⏰ This reservation has expired. Your hold was released and the items are available again."
        );
        setReservation((prev) =>
          prev ? { ...prev, status: "RELEASED" } : prev
        );
        localStorage.setItem(
          `reservation:${params.id}`,
          JSON.stringify({ ...reservation, status: "RELEASED" })
        );
        return;
      }

      if (!res.ok) {
        setActionError(data.error ?? "Something went wrong");
        return;
      }

      // Update state with confirmed reservation
      const confirmed = { ...reservation, status: "CONFIRMED" as const };
      setReservation(confirmed);
      localStorage.setItem(
        `reservation:${params.id}`,
        JSON.stringify(confirmed)
      );
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!reservation) return;
    setActionLoading("cancel");
    setActionError(null);

    try {
      const res = await fetch(`/api/reservations/${reservation.id}/release`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error ?? "Something went wrong");
        return;
      }

      const released = { ...reservation, status: "RELEASED" as const };
      setReservation(released);
      localStorage.setItem(
        `reservation:${params.id}`,
        JSON.stringify(released)
      );
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
        }}
      >
        <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
          Loading reservation...
        </div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
          gap: 16,
        }}
      >
        <div style={{ fontSize: 48 }}>🔍</div>
        <p style={{ color: "var(--text)", fontSize: 18, fontWeight: 600 }}>
          Reservation not found
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          This reservation may have expired or doesn&apos;t exist.
        </p>
        <button
          onClick={() => router.push("/")}
          style={{
            marginTop: 8,
            padding: "10px 20px",
            background: "var(--accent)",
            border: "none",
            borderRadius: 8,
            color: "#000",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          ← Back to products
        </button>
      </div>
    );
  }

  const isPending = reservation.status === "PENDING";
  const isConfirmed = reservation.status === "CONFIRMED";
  const isReleased = reservation.status === "RELEASED";
  const totalPrice = reservation.product.price * reservation.quantity;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div
          style={{
            maxWidth: 700,
            margin: "0 auto",
            padding: "0 24px",
            height: 64,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <button
            onClick={() => router.push("/")}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 20,
              display: "flex",
              alignItems: "center",
              padding: 4,
            }}
          >
            ←
          </button>
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: "var(--text)",
                letterSpacing: "-0.01em",
              }}
            >
              {isConfirmed
                ? "Order Confirmed"
                : isReleased
                  ? "Reservation Released"
                  : "Complete Your Purchase"}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                fontFamily: "DM Mono, monospace",
              }}
            >
              #{reservation.id.slice(-8).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main
        style={{
          maxWidth: 700,
          margin: "0 auto",
          padding: "40px 24px",
        }}
      >
        {/* Status banner */}
        {isConfirmed && (
          <div
            className="fade-in"
            style={{
              padding: "16px 20px",
              background: "var(--green-dim)",
              border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: 10,
              color: "var(--green)",
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 14,
            }}
          >
            <span style={{ fontSize: 20 }}>✓</span>
            <div>
              <strong>Payment confirmed!</strong> Your order has been placed and
              the items have been reserved for you.
            </div>
          </div>
        )}

        {isReleased && !actionError && (
          <div
            className="fade-in"
            style={{
              padding: "16px 20px",
              background: "rgba(107,116,144,0.1)",
              border: "1px solid rgba(107,116,144,0.2)",
              borderRadius: 10,
              color: "var(--text-muted)",
              marginBottom: 24,
              fontSize: 14,
            }}
          >
            This reservation was released. The items are now available for other
            shoppers.
          </div>
        )}

        {actionError && (
          <div
            className="fade-in"
            style={{
              padding: "16px 20px",
              background: "var(--red-dim)",
              border: "1px solid rgba(244,63,94,0.3)",
              borderRadius: 10,
              color: "var(--red)",
              marginBottom: 24,
              fontSize: 14,
            }}
          >
            {actionError}
          </div>
        )}

        {/* Main card */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          {/* Product info */}
          <div
            style={{
              padding: 24,
              borderBottom: "1px solid var(--border)",
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
            }}
          >
            {reservation.product.imageUrl && (
              <img
                src={reservation.product.imageUrl}
                alt={reservation.product.name}
                style={{
                  width: 72,
                  height: 72,
                  objectFit: "cover",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  flexShrink: 0,
                }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--text)",
                  letterSpacing: "-0.02em",
                  marginBottom: 4,
                }}
              >
                {reservation.product.name}
              </h2>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  fontFamily: "DM Mono, monospace",
                  marginBottom: 8,
                }}
              >
                SKU: {reservation.product.sku}
              </div>
              <div
                style={{
                  display: "inline-flex",
                  padding: "3px 10px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  ...(isPending
                    ? {
                        background: "var(--accent-dim)",
                        color: "var(--accent)",
                        border: "1px solid rgba(245,158,11,0.25)",
                      }
                    : isConfirmed
                      ? {
                          background: "var(--green-dim)",
                          color: "var(--green)",
                          border: "1px solid rgba(16,185,129,0.25)",
                        }
                      : {
                          background: "rgba(107,116,144,0.15)",
                          color: "var(--text-muted)",
                          border: "1px solid rgba(107,116,144,0.2)",
                        }),
                }}
              >
                {isPending ? "⏳ Pending" : isConfirmed ? "✓ Confirmed" : "Released"}
              </div>
            </div>
          </div>

          {/* Countdown timer (only for pending) */}
          {isPending && (
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--border)",
                background:
                  "linear-gradient(135deg, rgba(245,158,11,0.04) 0%, transparent 100%)",
              }}
            >
              <ReservationTimer
                expiresAt={reservation.expiresAt}
                onExpired={() => {
                  setReservation((prev) =>
                    prev ? { ...prev, status: "RELEASED" } : prev
                  );
                  setActionError(
                    "⏰ Your reservation has expired. The items have been released back to inventory."
                  );
                }}
              />
            </div>
          )}

          {/* Order summary */}
          <div style={{ padding: 24, borderBottom: "1px solid var(--border)" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-muted)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Order Summary
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <SummaryRow
                label="Warehouse"
                value={`${reservation.warehouse.name} · ${reservation.warehouse.location}`}
              />
              <SummaryRow
                label="Quantity"
                value={`${reservation.quantity} unit${reservation.quantity > 1 ? "s" : ""}`}
              />
              <SummaryRow
                label="Unit price"
                value={formatPrice(reservation.product.price)}
                mono
              />
              <div
                style={{
                  borderTop: "1px solid var(--border)",
                  paddingTop: 10,
                  marginTop: 4,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text)",
                  }}
                >
                  Total
                </span>
                <span
                  style={{
                    fontFamily: "DM Mono, monospace",
                    fontSize: 18,
                    fontWeight: 500,
                    color: "var(--accent)",
                  }}
                >
                  {formatPrice(totalPrice)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {isPending && (
            <div
              style={{
                padding: 24,
                display: "flex",
                gap: 12,
              }}
            >
              <button
                onClick={handleCancel}
                disabled={!!actionLoading}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  background: "transparent",
                  border: "1px solid var(--border-light)",
                  borderRadius: 10,
                  color:
                    actionLoading === "cancel"
                      ? "var(--text-muted)"
                      : "var(--text)",
                  fontWeight: 500,
                  fontSize: 14,
                  cursor: actionLoading ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                {actionLoading === "cancel" ? "Cancelling…" : "Cancel"}
              </button>
              <button
                onClick={handleConfirm}
                disabled={!!actionLoading}
                style={{
                  flex: 2,
                  padding: "12px 20px",
                  background:
                    actionLoading === "confirm"
                      ? "rgba(245,158,11,0.7)"
                      : "var(--accent)",
                  border: "none",
                  borderRadius: 10,
                  color: "#000",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: actionLoading ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                  fontFamily: "DM Sans, sans-serif",
                  letterSpacing: "-0.01em",
                }}
              >
                {actionLoading === "confirm"
                  ? "Processing…"
                  : `Confirm Purchase · ${formatPrice(totalPrice)}`}
              </button>
            </div>
          )}

          {(isConfirmed || isReleased) && (
            <div style={{ padding: 24 }}>
              <button
                onClick={() => router.push("/")}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  background: "var(--surface-hover)",
                  border: "1px solid var(--border-light)",
                  borderRadius: 10,
                  color: "var(--text)",
                  fontWeight: 500,
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                ← Continue Shopping
              </button>
            </div>
          )}
        </div>

        {/* Technical footnote */}
        <div
          style={{
            marginTop: 20,
            padding: "12px 16px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 11,
            color: "var(--text-subtle)",
            fontFamily: "DM Mono, monospace",
          }}
        >
          Reservation ID: {reservation.id}
        </div>
      </main>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
      <span
        style={{
          fontSize: 13,
          color: "var(--text)",
          fontFamily: mono ? "DM Mono, monospace" : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}
