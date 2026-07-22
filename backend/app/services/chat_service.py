from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.conversation import Conversation
from app.models.message import Message, MessageRole


class ChatError(Exception):
    def __init__(self, message: str, status_code: int = 404):
        self.message = message
        self.status_code = status_code


def list_conversations(db: Session, user_id) -> list[Conversation]:
    stmt = (
        select(Conversation)
        .where(Conversation.user_id == user_id, Conversation.deleted_at.is_(None))
        .order_by(Conversation.updated_at.desc())
    )
    return list(db.scalars(stmt))


def create_conversation(db: Session, user_id) -> Conversation:
    conversation = Conversation(user_id=user_id)
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


def get_owned_conversation(db: Session, conversation_id, user_id) -> Conversation:
    conversation = db.get(Conversation, conversation_id)
    if not conversation or conversation.user_id != user_id or conversation.deleted_at is not None:
        raise ChatError("Conversation not found.", status_code=404)
    return conversation


def get_conversation_with_messages(db: Session, conversation_id, user_id) -> Conversation:
    conversation = get_owned_conversation(db, conversation_id, user_id)
    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.asc())
    )
    conversation.loaded_messages = list(db.scalars(stmt))
    return conversation


def get_message_history(db: Session, conversation_id, limit: int = 20) -> list[dict]:
    """Recent history formatted for the LLM call. Trimmed to `limit` most recent
    messages — a real context-length safeguard, not just a nicety."""
    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    rows = list(db.scalars(stmt))[::-1]
    return [{"role": m.role.value, "content": m.content} for m in rows]


def create_user_message(db: Session, conversation_id, user_id, content: str) -> tuple[Message, bool]:
    conversation = get_owned_conversation(db, conversation_id, user_id)
    is_first_message = (
        db.scalar(select(Message).where(Message.conversation_id == conversation.id)) is None
    )
    user_message = Message(conversation_id=conversation.id, role=MessageRole.user, content=content)
    db.add(user_message)
    db.commit()
    db.refresh(user_message)
    return user_message, is_first_message


def save_assistant_message(
    db: Session, conversation_id, content: str, model: str, is_first_message: bool, user_content: str
) -> tuple[Message, str]:
    conversation = db.get(Conversation, conversation_id)
    assistant_message = Message(
        conversation_id=conversation.id, role=MessageRole.assistant, content=content, model=model
    )
    db.add(assistant_message)

    if is_first_message:
        conversation.title = user_content[:50]
    conversation.model = model
    conversation.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(assistant_message)
    return assistant_message, conversation.title


def soft_delete_conversation(db: Session, conversation_id, user_id) -> None:
    conversation = get_owned_conversation(db, conversation_id, user_id)
    conversation.deleted_at = datetime.now(timezone.utc)
    db.commit()