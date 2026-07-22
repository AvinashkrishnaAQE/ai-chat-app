import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ConversationListItem(BaseModel):
    id: uuid.UUID
    title: str
    model: str | None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MessageOut(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    model: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationDetail(BaseModel):
    id: uuid.UUID
    title: str
    model: str | None
    messages: list[MessageOut]

    model_config = ConfigDict(from_attributes=True)


class ModelInfo(BaseModel):
    id: str
    label: str