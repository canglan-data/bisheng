# coding=utf-8
# python version >= 3.6
import traceback

from alibabacloud_green20220302.client import Client
from alibabacloud_green20220302 import models
from alibabacloud_tea_openapi.models import Config
import json
import os
import logging
from bisheng.settings import settings, AliyunTextModerationConf


class AliyunTextModeration:
    """阿里云文本内容审核服务封装"""

    def __init__(self,config: AliyunTextModerationConf):
        """
        初始化阿里云文本审核客户端

        Args:
            access_key_id: 阿里云AccessKey ID，优先从参数获取，否则尝试从环境变量读取
            access_key_secret: 阿里云AccessKey Secret，优先从参数获取，否则尝试从环境变量读取
            region_id: 服务区域ID
            endpoint: 服务端点
            connect_timeout: 连接超时时间(ms)
            read_timeout: 读取超时时间(ms)
        """
        # 优先使用传入的密钥，否则尝试从环境变量获取
        self.access_key_id = config.access_key_id
        self.access_key_secret = config.access_key_secret

        # 验证必要参数
        if not self.access_key_id or not self.access_key_secret:
            raise ValueError("缺少必要的认证信息: access_key_id 或 access_key_secret")

        # 初始化客户端配置
        self.config = Config(
            access_key_id=config.access_key_id,
            access_key_secret=config.access_key_secret,
            connect_timeout=config.connect_timeout,
            read_timeout=config.read_timeout,
            region_id=config.region_id,
            endpoint=config.endpoint
        )

        self.client = Client(self.config)
        self.logger = logging.getLogger(__name__)

    def moderate_text(self, content: str, service_type: str = 'query_security_check') -> bool:
        # 验证输入
        if not content:
            raise ValueError("审核文本内容不能为空")

        # 构建请求参数
        service_parameters = {
            'content': content
        }

        # 构建API请求
        request = models.TextModerationPlusRequest(
            service=service_type,
            service_parameters=json.dumps(service_parameters)
        )

        try:
            # 执行API调用
            response = self.client.text_moderation_plus(request)

            # 处理响应
            if response.status_code == 200:
                result = response.body
                self.logger.info(f"文本审核成功: {result}")
                return True
            else:
                error_msg = f"API调用失败: HTTP状态码 {response.status_code}, 响应: {response}"
                self.logger.error(error_msg)
                return False

        except Exception as e:
            self.logger.error(f"文本审核异常: {str(e)}")
            return False


AliyunTextModeration = AliyunTextModeration(settings.aliyun_text_moderation_conf)
