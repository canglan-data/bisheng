import uuid
from datetime import datetime

from dirtyjson.compat import long_type
from langchain_core.messages import BaseMessage,HumanMessage

from bisheng.api.services.send_mail.vital_org_stats import VitalOrgStatsService
from bisheng.database.models import llm_server
from bisheng.database.models.llm_server import LLMDao, LLMModelType
from bisheng.database.models.scheduled_task_logs import ScheduledTaskLogsDao, LogType, ScheduledTaskLogs
from bisheng.interface.embeddings.custom import BishengEmbedding
from bisheng.interface.llms.custom import BishengLLM
from bisheng.interface.stts.custom import BishengSTT
from bisheng.interface.ttss.custom import BishengTTS
from bisheng.worker import bisheng_celery
from loguru import logger
task_name = 'vital_org_stats'
last_run_time = None
def insert_start(task_id):
    data = ScheduledTaskLogs(task_id=task_id,task_name=task_name,log_type=LogType.STARTED.value)
    ScheduledTaskLogsDao.insert_one(data)

def insert_finish(task_id):
    data = ScheduledTaskLogs(task_id=task_id,task_name=task_name,log_type=LogType.FINISHED.value,log_content={})
    ScheduledTaskLogsDao.insert_one(data)

def insert_progress(task_id,model_id,status,msg=None):
    log_content = {"model_id":model_id,"status": status,"msg": msg}
    data = ScheduledTaskLogs(task_id=task_id,task_name=task_name,log_content=log_content,log_type=LogType.IN_PROGRESS.value)
    ScheduledTaskLogsDao.insert_one(data)

def vital_org_stats_task():
    task_id = str(uuid.uuid4())
    insert_start(task_id)
    try:
        VitalOrgStatsService.send()
    except Exception as e:
        logger.error(e)
    insert_finish(task_id)
