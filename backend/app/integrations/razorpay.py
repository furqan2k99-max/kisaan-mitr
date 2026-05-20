"""
Kisaan Mitr — Razorpay Payment Integration
Order creation, capture, escrow, refunds, and webhook verification.

STUB MODE: When RAZORPAY_KEY_ID is empty, all methods return realistic
mock responses with generated IDs. No external calls are made.
"""

import logging
import hmac
import hashlib
import time
import uuid
import asyncio
from typing import Optional, Dict, Any
from uuid import UUID

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class RazorpayClient:
    """Razorpay API wrapper for payment processing and escrow management."""

    def __init__(self):
        self.key_id = settings.RAZORPAY_KEY_ID
        self.key_secret = settings.RAZORPAY_KEY_SECRET
        self.base_url = "https://api.razorpay.com/v1"
        self.webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET
        self.stub_mode = not bool(self.key_id and self.key_secret)
        if self.stub_mode:
            logger.info("Razorpay running in STUB mode (no API keys)")

    def _get_auth(self) -> tuple:
        return (self.key_id, self.key_secret)

    async def create_payment_order(
        self, amount: float, load_request_id: UUID,
        currency: str = "INR", payment_type: str = "full",
    ) -> Optional[Dict[str, Any]]:
        """Create a Razorpay order (or mock in stub mode)."""
        if self.stub_mode:
            return await self._stub_create_order(amount, load_request_id, currency)

        try:
            receipt = f"lr_{load_request_id}_{int(time.time())}"
            payload = {
                "amount": int(amount * 100), "currency": currency, "receipt": receipt,
                "notes": {"load_request_id": str(load_request_id), "payment_type": payment_type, "platform": "kisaan_mitr"},
            }
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(f"{self.base_url}/orders", auth=self._get_auth(), json=payload)
                if response.status_code == 200:
                    order = response.json()
                    logger.info("Razorpay order created: %s", order.get("id"))
                    return {"order_id": order["id"], "amount": order["amount"] / 100, "currency": order["currency"], "receipt": order["receipt"], "status": order["status"]}
                logger.error("Razorpay order error: %s", response.text)
                return None
        except Exception as e:
            logger.error("Razorpay create order error: %s", e)
            return None

    async def _stub_create_order(self, amount: float, load_request_id: UUID, currency: str) -> Dict[str, Any]:
        await asyncio.sleep(0.2)
        order_id = f"order_stub_{uuid.uuid4().hex[:16]}"
        logger.info("[STUB] Razorpay order created: %s (₹%.2f)", order_id, amount)
        return {"order_id": order_id, "amount": amount, "currency": currency, "receipt": f"lr_{load_request_id}", "status": "created", "stub": True}

    async def capture_payment(self, payment_id: str, amount: Optional[float] = None) -> Optional[Dict[str, Any]]:
        """Capture a payment (or mock)."""
        if self.stub_mode:
            await asyncio.sleep(0.1)
            logger.info("[STUB] Payment captured: %s", payment_id)
            return {"payment_id": payment_id, "amount": amount or 0, "status": "captured", "stub": True}

        try:
            payload = {"amount": int(amount * 100)} if amount else {}
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(f"{self.base_url}/payments/{payment_id}/capture", auth=self._get_auth(), json=payload)
                if response.status_code == 200:
                    p = response.json()
                    return {"payment_id": p["id"], "amount": p["amount"] / 100, "status": p["status"]}
                return None
        except Exception as e:
            logger.error("Razorpay capture error: %s", e)
            return None

    async def create_escrow(self, amount: float, load_request_id: UUID, beneficiary_id: str = None) -> Optional[Dict[str, Any]]:
        """Create escrow hold (or mock)."""
        if self.stub_mode:
            await asyncio.sleep(0.1)
            escrow_id = f"escrow_stub_{uuid.uuid4().hex[:12]}"
            logger.info("[STUB] Escrow created: %s (₹%.2f)", escrow_id, amount)
            return {"escrow_id": escrow_id, "amount": amount, "status": "held", "stub": True}

        try:
            payload = {"amount": int(amount * 100), "currency": "INR", "notes": {"load_request_id": str(load_request_id), "purpose": "delivery_escrow"}}
            if beneficiary_id:
                payload["beneficiary_id"] = beneficiary_id
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(f"{self.base_url}/escrow", auth=self._get_auth(), json=payload)
                if response.status_code == 200:
                    e = response.json()
                    return {"escrow_id": e["id"], "amount": e["amount"] / 100, "status": e["status"]}
                return None
        except Exception as e:
            logger.error("Razorpay escrow error: %s", e)
            return None

    async def release_escrow(self, escrow_id: str, transfer_to: str = None) -> Optional[Dict[str, Any]]:
        """Release escrow (or mock)."""
        if self.stub_mode:
            await asyncio.sleep(0.1)
            logger.info("[STUB] Escrow released: %s", escrow_id)
            return {"escrow_id": escrow_id, "status": "released", "amount": 0, "stub": True}

        try:
            payload = {"transfers": [{"account": transfer_to}]} if transfer_to else {}
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(f"{self.base_url}/escrow/{escrow_id}/release", auth=self._get_auth(), json=payload)
                if response.status_code == 200:
                    r = response.json()
                    return {"escrow_id": escrow_id, "status": "released", "amount": r.get("amount_released", 0) / 100}
                return None
        except Exception as e:
            logger.error("Razorpay escrow release error: %s", e)
            return None

    async def refund_payment(self, payment_id: str, amount: Optional[float] = None, reason: str = "requested_by_customer") -> Optional[Dict[str, Any]]:
        """Initiate refund (or mock)."""
        if self.stub_mode:
            await asyncio.sleep(0.1)
            refund_id = f"rfnd_stub_{uuid.uuid4().hex[:12]}"
            logger.info("[STUB] Refund: %s for payment %s", refund_id, payment_id)
            return {"refund_id": refund_id, "amount": amount or 0, "status": "processed", "stub": True}

        try:
            payload = {"notes": {"reason": reason, "platform": "kisaan_mitr"}}
            if amount:
                payload["amount"] = int(amount * 100)
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(f"{self.base_url}/payments/{payment_id}/refund", auth=self._get_auth(), json=payload)
                if response.status_code == 200:
                    r = response.json()
                    return {"refund_id": r["id"], "amount": r["amount"] / 100, "status": r["status"]}
                return None
        except Exception as e:
            logger.error("Razorpay refund error: %s", e)
            return None

    def verify_webhook_signature(self, payload: str, signature: str) -> bool:
        """Verify Razorpay webhook signature."""
        if self.stub_mode:
            logger.info("[STUB] Webhook signature accepted")
            return True

        if not self.webhook_secret:
            logger.warning("Webhook secret not configured")
            return False

        try:
            expected = hmac.HMAC(self.webhook_secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
            return hmac.compare_digest(expected, signature)
        except Exception as e:
            logger.error("Webhook verification error: %s", e)
            return False


class PaymentService:
    """High-level payment service for the platform."""

    def __init__(self):
        self.razorpay = RazorpayClient()

    async def process_load_payment(self, load_request_id: UUID, amount: float, fare_share: float, trip_id: UUID = None) -> Optional[Dict[str, Any]]:
        order = await self.razorpay.create_payment_order(amount=amount, load_request_id=load_request_id, payment_type="full")
        if not order:
            return {"status": "failed", "error": "Payment order creation failed"}
        return {"status": "pending_capture", "order_id": order["order_id"], "amount": amount, "escrow_amount": fare_share, "load_request_id": str(load_request_id)}

    async def confirm_delivery_and_release(self, load_request_id: UUID, escrow_id: str) -> Dict[str, Any]:
        result = await self.razorpay.release_escrow(escrow_id)
        if result:
            return {"status": "released", "released_amount": result.get("amount"), "load_request_id": str(load_request_id)}
        return {"status": "failed", "error": "Escrow release failed"}