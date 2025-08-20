from typing import Optional

from bisheng.database.models.workflow_node_logs import WorkflowNodeLog,WorkflowNodeLogDao


class WorkflowNodeLogService:
    @classmethod
    def insert_one(cls, data: WorkflowNodeLog) -> Optional[WorkflowNodeLog]:
        return WorkflowNodeLogDao().insert_one(data)