export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class InsufficientStockError extends AppError {
  constructor(message = "Not enough stock available") {
    super(message, 409, "INSUFFICIENT_STOCK");
  }
}

export class ReservationExpiredError extends AppError {
  constructor(message = "This reservation has expired") {
    super(message, 410, "RESERVATION_EXPIRED");
  }
}

export class ReservationNotFoundError extends AppError {
  constructor(message = "Reservation not found") {
    super(message, 404, "RESERVATION_NOT_FOUND");
  }
}

export class ReservationInvalidStateError extends AppError {
  constructor(message: string) {
    super(message, 422, "INVALID_STATE");
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  console.error("Unexpected error:", error);
  return Response.json(
    { error: "Internal server error", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}
