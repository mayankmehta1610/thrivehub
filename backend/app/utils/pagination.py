from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field
from sqlalchemy import asc, desc, or_
from sqlalchemy.orm import Query

T = TypeVar("T")


class PaginationParams(BaseModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
    sort_by: str | None = None
    sort_order: str = Field("desc", pattern="^(asc|desc)$")
    search: str | None = None

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int
    sort_by: str | None = None
    sort_order: str = "desc"
    search: str | None = None


def apply_pagination(
    query: Query,
    params: PaginationParams,
    *,
    default_sort: str,
    search_fields: list[str] | None = None,
    sort_map: dict[str, Any] | None = None,
) -> tuple[list[Any], int]:
    sort_map = sort_map or {}
    if params.search and search_fields:
        term = f"%{params.search.strip()}%"
        query = query.filter(or_(*[field.ilike(term) for field in search_fields]))

    sort_column = sort_map.get(params.sort_by or default_sort, sort_map.get(default_sort))
    if sort_column is not None:
        order_fn = desc if params.sort_order == "desc" else asc
        query = query.order_by(order_fn(sort_column))

    total = query.count()
    items = query.offset(params.offset).limit(params.page_size).all()
    total_pages = max(1, (total + params.page_size - 1) // params.page_size)
    return items, total, total_pages


def paginated(items: list[T], total: int, params: PaginationParams, total_pages: int) -> PaginatedResponse[T]:
    return PaginatedResponse(
        items=items,
        total=total,
        page=params.page,
        page_size=params.page_size,
        total_pages=total_pages,
        sort_by=params.sort_by,
        sort_order=params.sort_order,
        search=params.search,
    )
