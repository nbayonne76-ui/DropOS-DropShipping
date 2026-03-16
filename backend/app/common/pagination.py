from __future__ import annotations

import math
from typing import Generic, TypeVar

from fastapi import Query
from pydantic import BaseModel, Field, model_validator

T = TypeVar("T")

_MAX_PAGE_SIZE = 100
_DEFAULT_PAGE_SIZE = 20


class PageParams:
    """Reusable FastAPI dependency for cursor-based page + page_size params."""

    def __init__(
        self,
        page: int = Query(default=1, ge=1, description="1-indexed page number."),
        page_size: int = Query(
            default=_DEFAULT_PAGE_SIZE,
            ge=1,
            le=_MAX_PAGE_SIZE,
            description=f"Number of items per page (max {_MAX_PAGE_SIZE}).",
        ),
    ) -> None:
        self.page = page
        self.page_size = page_size

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size


class Page(BaseModel, Generic[T]):
    """Generic paginated response envelope."""

    items: list[T] = Field(description="Page of results.")
    total: int = Field(ge=0, description="Total number of items across all pages.")
    page: int = Field(ge=1, description="Current page number (1-indexed).")
    page_size: int = Field(ge=1, description="Items per page.")
    pages: int = Field(ge=0, description="Total number of pages.")

    @model_validator(mode="before")
    @classmethod
    def compute_pages(cls, values: dict) -> dict:
        total = values.get("total", 0)
        page_size = values.get("page_size", _DEFAULT_PAGE_SIZE)
        if page_size and total is not None:
            values["pages"] = math.ceil(total / page_size) if page_size > 0 else 0
        return values

    @classmethod
    def create(
        cls,
        items: list[T],
        total: int,
        params: PageParams,
    ) -> "Page[T]":
        return cls(
            items=items,
            total=total,
            page=params.page,
            page_size=params.page_size,
            pages=math.ceil(total / params.page_size) if params.page_size > 0 else 0,
        )
