from uuid import UUID

from fastapi import APIRouter, Depends, Body

from bisheng.api.services.llm import LLMService
from bisheng.api.services.user_service import UserPayload, get_login_user
from bisheng.api.v1.schemas import (UnifiedResponseModel, resp_200, resp_500)
from bisheng.interface.ttss.custom import BishengTTS

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
        url = BishengTTS(model_id=model_id).synthesize_and_upload(text)
        return resp_200(data={"url": url})
    except Exception as e:
        return resp_500(message=f'{str(e)}')