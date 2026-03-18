from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TeamMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    user_id: uuid.UUID
    role: str
    created_at: datetime

    # Denormalised from the related User (populated by the service)
    email: str
    full_name: str | None


class InviteRequest(BaseModel):
    email: EmailStr = Field(description="Email address of the user to invite.")
    role: str = Field(
        default="viewer",
        description="Role to assign: viewer | admin",
    )


class UpdateRoleRequest(BaseModel):
    role: str = Field(description="New role: viewer | admin")
