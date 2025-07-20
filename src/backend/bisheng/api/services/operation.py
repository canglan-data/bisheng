import json

from celery.schedules import crontab
from redbeat import RedBeatSchedulerEntry

from bisheng.api.services.user_service import UserPayload
from bisheng.api.v1.schema.send_mail import VitalOrgStatsConfig
from bisheng.database.models.config import ConfigDao, ConfigKeyEnum, Config


# TODO merge_check 2整个文件都要检查，特别是session查询相关


class OperationService:
    @classmethod
    def update_vital_org_stats_config(cls, user: UserPayload, data: VitalOrgStatsConfig):
        from bisheng.worker import bisheng_celery
        hour = data.get_hour()
        minute = data.get_minute()
        schedule = {
            'hour': hour,
            'minute': minute
        }
        beat_task = RedBeatSchedulerEntry(name='vital_org_stats',
                                          task='bisheng.worker.audit.vital_org_stats.vital_org_stats_task',
                                          schedule=crontab(**schedule),
                                          app=bisheng_celery)
        beat_task.delete()
        beat_task.save()

        """ 更新 vital_org_stats 配置 """
        config = ConfigDao.get_config(ConfigKeyEnum.VITAL_ORG_STATS)
        if config:
            config.value = json.dumps(data.dict())
        else:
            config = Config(key=ConfigKeyEnum.VITAL_ORG_STATS.value, value=json.dumps(data.dict()))
        ConfigDao.insert_config(config)
        return data

    @classmethod
    def get_vital_org_stats(cls):
        """ 获取 vital_org_stats 配置 """
        ret = {}
        config = ConfigDao.get_config(ConfigKeyEnum.VITAL_ORG_STATS)
        if config:
            ret = json.loads(config.value)
        return VitalOrgStatsConfig(**ret)
