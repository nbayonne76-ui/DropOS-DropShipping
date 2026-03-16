from __future__ import annotations

from fastapi import status


class DropOSError(Exception):
    """Base exception for all DropOS domain errors."""

    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    detail: str = "An unexpected error occurred."

    def __init__(self, detail: str | None = None) -> None:
        self.detail = detail or self.__class__.detail
        super().__init__(self.detail)


class NotFoundError(DropOSError):
    status_code = status.HTTP_404_NOT_FOUND
    detail = "The requested resource was not found."

    def __init__(self, resource: str = "Resource", id: object = None) -> None:
        msg = f"{resource} not found."
        if id is not None:
            msg = f"{resource} with id '{id}' not found."
        super().__init__(detail=msg)


class ForbiddenError(DropOSError):
    status_code = status.HTTP_403_FORBIDDEN
    detail = "You do not have permission to perform this action."


class ConflictError(DropOSError):
    status_code = status.HTTP_409_CONFLICT
    detail = "A conflict occurred with the current state of the resource."

    def __init__(self, detail: str = "Resource already exists.") -> None:
        super().__init__(detail=detail)


class UnauthorizedError(DropOSError):
    status_code = status.HTTP_401_UNAUTHORIZED
    detail = "Authentication credentials are missing or invalid."

    def __init__(self, detail: str = "Could not validate credentials.") -> None:
        super().__init__(detail=detail)


class ValidationError(DropOSError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    detail = "Validation failed."

    def __init__(self, detail: str = "Validation failed.") -> None:
        super().__init__(detail=detail)


class PlanRequiredError(DropOSError):
    status_code = status.HTTP_402_PAYMENT_REQUIRED
    detail = "Your current plan does not include access to this feature."

    def __init__(self, required_plan: str) -> None:
        super().__init__(
            detail=f"This feature requires the '{required_plan}' plan or higher."
        )
