import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.core.security import decode_access_token
from app.core.config import settings
from app.models.user import User
from app.services import chat_service
from app.services.llm_service import stream_completion, is_valid_model, DEFAULT_MODEL, LLMError

router = APIRouter()

AUTH_TIMEOUT_SECONDS = 10


@router.websocket("/ws/chats/{conversation_id}")
async def chat_websocket(websocket: WebSocket, conversation_id: str):
    origin = websocket.headers.get("origin")
    if origin != settings.FRONTEND_ORIGIN:
        await websocket.close(code=4008, reason="Origin not allowed")
        return

    await websocket.accept()

    try:
        auth_payload = await asyncio.wait_for(websocket.receive_json(), timeout=AUTH_TIMEOUT_SECONDS)
    except asyncio.TimeoutError:
        await websocket.close(code=4001, reason="Authentication timeout")
        return
    except (json.JSONDecodeError, ValueError):
        await websocket.close(code=4002, reason="Invalid authentication payload")
        return

    if auth_payload.get("type") != "auth" or "token" not in auth_payload:
        await websocket.close(code=4002, reason="Invalid authentication payload")
        return

    token_payload = decode_access_token(auth_payload["token"])
    if token_payload is None:
        await websocket.close(code=4003, reason="Invalid or expired token")
        return

    db: Session = SessionLocal()
    try:
        user = db.get(User, token_payload["sub"])
        if user is None or not user.is_active:
            await websocket.close(code=4003, reason="Unauthorized")
            return

        try:
            chat_service.get_owned_conversation(db, conversation_id, user.id)
        except chat_service.ChatError:
            await websocket.close(code=4004, reason="Conversation not found")
            return

        await websocket.send_json({"type": "auth_ok"})

        while True:
            try:
                data = await websocket.receive_json()
            except (json.JSONDecodeError, ValueError):
                await websocket.send_json({"type": "error", "detail": "Invalid message format"})
                continue

            if data.get("type") != "message" or not data.get("content", "").strip():
                await websocket.send_json({"type": "error", "detail": "Invalid message payload"})
                continue

            content = data["content"].strip()
            model_id = data.get("model", DEFAULT_MODEL)
            if not is_valid_model(model_id):
                await websocket.send_json({"type": "error", "detail": f"Unknown model: {model_id}"})
                continue

            try:
                _, is_first = chat_service.create_user_message(db, conversation_id, user.id, content)
            except chat_service.ChatError as e:
                await websocket.send_json({"type": "error", "detail": e.message})
                continue

            history = chat_service.get_message_history(db, conversation_id)

            full_reply = ""
            stream_failed = False
            try:
                async for chunk in stream_completion(model_id, history):
                    full_reply += chunk
                    await websocket.send_json({"type": "token", "content": chunk})
            except LLMError as e:
                stream_failed = True
                await websocket.send_json({"type": "error", "detail": e.message})

            if stream_failed:
                # Don't save a partial/empty assistant message on failure — the
                # user's message is already persisted; nothing else to commit here.
                continue

            assistant_message, conversation_title = chat_service.save_assistant_message(
                db, conversation_id, full_reply, model_id, is_first, content
            )

            await websocket.send_json({
                "type": "done",
                "assistant_message": {
                    "id": str(assistant_message.id),
                    "role": assistant_message.role.value,
                    "content": assistant_message.content,
                    "model": assistant_message.model,
                    "created_at": assistant_message.created_at.isoformat(),
                },
                "conversation_title": conversation_title,
            })

    except WebSocketDisconnect:
        pass
    finally:
        db.close()