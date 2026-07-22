from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.chat import ConversationListItem, ConversationDetail, ModelInfo
from app.services import chat_service
from app.services.llm_service import MODEL_CATALOG

router = APIRouter(prefix="/chats", tags=["chats"])


@router.get("/models", response_model=list[ModelInfo])
def list_models():
    return MODEL_CATALOG


@router.get("", response_model=list[ConversationListItem])
def list_chats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return chat_service.list_conversations(db, current_user.id)


@router.post("", response_model=ConversationListItem, status_code=201)
def create_chat(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return chat_service.create_conversation(db, current_user.id)


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_chat(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        conversation = chat_service.get_conversation_with_messages(db, conversation_id, current_user.id)
    except chat_service.ChatError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

    return ConversationDetail(
        id=conversation.id,
        title=conversation.title,
        model=conversation.model,
        messages=conversation.loaded_messages,
    )


@router.delete("/{conversation_id}", status_code=204)
def delete_chat(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        chat_service.soft_delete_conversation(db, conversation_id, current_user.id)
    except chat_service.ChatError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)