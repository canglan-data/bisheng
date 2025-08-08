from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator, EmailStr, conint, constr
from datetime import date, datetime, timedelta


class VitalOrgStatsConfig(BaseModel):
    # 邮件配置
    sender_email: EmailStr = Field(default=None, description="发件人邮件地址")
    sender_password: str = Field(default="", description="发件人邮箱密码")
    recipient_emails: List[EmailStr] = Field(default=[], description="收件邮箱列表")
    msg_from: str = Field(default="",description="发信人签名")

    # 执行时间配置
    execution_hour: conint(ge=0, le=23) = Field(default=10, description="执行时间（小时，0-23）")
    execution_minute: conint(ge=0, le=59) = Field(default=0, description="执行时间（分钟，0-59）")
    execution_interval_days: conint(ge=1) = Field(default=7, description="执行间隔（天，最小1天）")
    start_date: str = Field(default="2025-07-01", description="开始执行的日期（YYYY-MM-DD）")

    # 统计配置
    min_qa_count: conint(ge=0) = Field(default=5, description="最小问答次数")
    flow_ids: List[str] = Field(default=[], description="应用ID列表")
    group_ids: List[int] = Field(default=[], description="组织ID列表")

    smtp_host: str = Field(default="smtp.qq.com", description="SMTP主机")
    smtp_port: int = Field(default=465, description="SMTP端口")

    def get_hour(self):
        return self.execution_hour

    def get_minute(self):
        return self.execution_minute

    @field_validator("start_date", mode="before")
    def validate_start_date(cls, value: str) -> str:
        try:
            return datetime.strptime(value, "%Y-%m-%d").date().strftime("%Y-%m-%d")
        except ValueError:
            raise ValueError("日期格式必须为YYYY-MM-DD")

    def should_execute_on_date(self, target_date: Optional[date] = None) -> bool:
        """
        判断指定日期与开始日期之间的间隔天数是否为配置间隔的整数倍

        Args:
            target_date: 要判断的日期，默认为当前日期

        Returns:
            bool: 如果间隔天数是配置间隔的整数倍，返回True，否则返回False
        """
        if target_date is None:
            target_date = datetime.now()

        # 计算目标日期与开始日期之间的天数差
        days_diff = (target_date - datetime.strptime(self.start_date, "%Y-%m-%d").date()).days

        # 如果天数差为负数（目标日期早于开始日期），返回False
        if days_diff < 0:
            return False

        # 判断天数差是否为间隔天数的整数倍
        return days_diff % self.execution_interval_days == 0

