"use client";

import { useEffect, useState } from "react";

interface ReservationTimerProps {
  expiresAt: string;
  onExpired: () => void;
}

export default function ReservationTimer({
  expiresAt,
  onExpired,
}: ReservationTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [hasExpired, setHasExpired] = useState(false);

  useEffect(() => {
    const computeTimeLeft = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      return Math.max(0, diff);
    };

    setTimeLeft(computeTimeLeft());

    const interval = setInterval(() => {
      const remaining = computeTimeLeft();
      setTimeLeft(remaining);

      if (remaining === 0 && !hasExpired) {
        setHasExpired(true);
        clearInterval(interval);
        onExpired();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [expiresAt, onExpired, hasExpired]);

  const totalSeconds = Math.ceil(timeLeft / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const totalDuration = 10 * 60; // 10 minutes
  const elapsed = totalDuration - totalSeconds;
  const progress = Math.min(1, elapsed / totalDuration);

  const isUrgent = totalSeconds <= 60;
  const isWarning = totalSeconds <= 120;

  const barColor = isUrgent
    ? "var(--red)"
    : isWarning
      ? "var(--accent)"
      : "var(--green)";

  if (hasExpired) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "var(--red)",
        }}
      >
        <span style={{ fontSize: 18 }}>⏰</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            Reservation expired
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            Your hold was released
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            className="pulse-dot"
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: barColor,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              fontWeight: 500,
            }}
          >
            {isUrgent
              ? "Hurry! Reservation expiring soon"
              : isWarning
                ? "Reservation expiring"
                : "Your hold is active"}
          </span>
        </div>

        {/* Countdown clock */}
        <div
          className={isUrgent ? "countdown-urgent" : undefined}
          style={{
            fontFamily: "DM Mono, monospace",
            fontSize: 22,
            fontWeight: 500,
            color: isUrgent ? "var(--red)" : isWarning ? "var(--accent)" : "var(--text)",
            letterSpacing: "0.02em",
            lineHeight: 1,
          }}
        >
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 4,
          background: "var(--border)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${(1 - progress) * 100}%`,
            background: barColor,
            borderRadius: 2,
            transition: "width 0.5s linear, background 0.3s",
          }}
        />
      </div>

      <div
        style={{
          fontSize: 11,
          color: "var(--text-subtle)",
          marginTop: 6,
          fontFamily: "DM Mono, monospace",
        }}
      >
        Expires {new Date(expiresAt).toLocaleTimeString()}
      </div>
    </div>
  );
}
