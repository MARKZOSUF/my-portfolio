import pytest
from app.ai.models.base import ModelMessage
from app.ai.models.development import DevelopmentModel
@pytest.mark.asyncio
async def test_fallback_is_transparent():
 out=await DevelopmentModel().generate([ModelMessage('user','TOPIC: Kirchhoff laws')]);assert 'development fallback' in out.text.lower();assert 'does not invent' in out.text.lower()
