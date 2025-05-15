import hashlib
from uuid import UUID

from fastapi import APIRouter, Depends, Body

from bisheng.api.services.llm import LLMService
from bisheng.api.services.user_service import UserPayload, get_login_user
from bisheng.api.utils import tts_text_md5_hash, md5_hash
from bisheng.api.v1.schemas import (UnifiedResponseModel, resp_200, resp_500)
from bisheng.interface.stts.custom import BishengSTT
from bisheng.interface.ttss.custom import BishengTTS
from bisheng.cache.redis import redis_client

router = APIRouter(prefix='/model_fun', dependencies=[Depends(get_login_user)])

@router.post('/tts', response_model=UnifiedResponseModel)
async def tts(*,
              text: str = Body(description='需要转成语音的文字'),
              model_id: int = Body(description='用户使用的模型id',default=0)):
    try:

        if not model_id:
            model_id = LLMService.get_default_tts_model_id()
        if not text:
            return resp_500(message=f'text 不能为空')
        text_md5 = tts_text_md5_hash(text)
        key = f"ttslock_{text_md5}_{model_id}"
        if not redis_client.setNx(key,1,30):
            return resp_500(message=f'转化中，请稍后再试')
        url = BishengTTS(model_id=model_id).synthesize_and_upload(text)
        redis_client.delete(key)
        return resp_200(data={"url": url})
    except Exception as e:
        return resp_500(message=f'{str(e)}')

@router.post('/stt', response_model=UnifiedResponseModel)
async def tts(*,
              url: str = Body(description='需要转成文字的语音'),
              model_id: int = Body(description='用户使用的模型id',default=0)):
    try:

        if not model_id:
            model_id = LLMService.get_default_tts_model_id()
        if not url:
            return resp_500(message=f'url 不能为空')
        url_md5 = md5_hash(url)
        key = f"sttlock_{url_md5}_{model_id}"
        if not redis_client.setNx(key,1,30):
            return resp_500(message=f'转化中，请稍后再试')
        url = BishengSTT(model_id=model_id).transcribe(url)
        redis_client.delete(key)
        return resp_200(data={"url": url})
    except Exception as e:
        return resp_500(message=f'{str(e)}')
