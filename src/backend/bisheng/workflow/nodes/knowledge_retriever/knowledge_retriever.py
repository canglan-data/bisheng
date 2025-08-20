import json
from typing import List, Any, Dict

import loguru
from bisheng_langchain.rag.bisheng_rag_chain import BishengRAGTool

from bisheng.api.services.llm import LLMService
from bisheng.chat.types import IgnoreException
from bisheng.database.models.user import UserDao
from bisheng.interface.importing.utils import import_vectorstore
from bisheng.interface.initialize.loading import instantiate_vectorstore
from bisheng.utils.minio_client import MinioClient
from bisheng.workflow.nodes.base import BaseNode
from langchain_core.language_models.fake_chat_models import FakeChatModel
from langchain.schema.document import Document


class KnowledgeRetrieverNode(BaseNode):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # 判断是知识库还是临时文件列表
        if 'knowledge' not in self.node_params:
            raise IgnoreException(f'{self.name} -- node params is error')

        self._knowledge_type = self.node_params['knowledge']['type']
        self._knowledge_value = [
            one['key'] for one in self.node_params['knowledge']['value']
        ]

        self._minio_client = MinioClient()

        self._knowledge_auth = self.node_params['user_auth']
        self._max_chunk_size = int(self.node_params['max_chunk_size'])
        self._sort_chunks = False

        self._llm = FakeChatModel()

        self._user_info = UserDao.get_user(int(self.user_id))

        self._milvus = None
        self._es = None

        self._user_question_list = []


    def _run(self, unique_id: str):

        self.init_milvus()
        self.init_es()

        self._user_question_list = self.init_user_question()

        bisheng_rag_tool = BishengRAGTool(vector_store=self._milvus,
                                          keyword_store=self._es,
                                          llm=self._llm,
                                          QA_PROMPT=None,
                                          max_content=self._max_chunk_size,
                                          sort_by_source_and_index=self._sort_chunks,
                                          return_source_documents=True)

        ret = []
        for index, question in enumerate(self._user_question_list):
            documents = bisheng_rag_tool.retrieval_and_rerank(query=question)

            item = {
                "question": question,
                "chunks": self.format_documents(documents)
            }

            ret.append(item)

        ret = json.dumps(ret, ensure_ascii=False)

        return {
            "retrieved_result": ret
        }

    def get_chunk_content(self, document: Document):
        content = document.page_content

        if 'paragraph_content' in content:
            content = content.split("<paragraph_content>")[1]
            content = content.split("</paragraph_content>")[0]

        return content

    def format_documents(self, documents: List[Document]) -> list[Dict]:
        result = []
        for document in documents:
            data = {}

            data['metadata'] = document.metadata
            data['text'] = self.get_chunk_content(document)
            result.append(data)

        return result


    def parse_log(self, unique_id: str, result: dict) -> Any:
        ret = []

        one_ret = [
            {'key': f'{self.id}.user_question', 'value': self._user_question_list, "type": "variable"},
            {'key': f'{self.id}.retrieved_result', 'value': result.get("retrieved_result", []), "type": "variable"},
        ]

        ret.append(one_ret)

        return ret

    def init_user_question(self) -> List[str]:
        # 默认把用户问题都转为字符串
        ret = []
        for one in self.node_params['user_question']:
            ret.append(f"{self.get_other_node_variable(one)}")
        return ret

    def init_milvus(self):
        if self._knowledge_type == 'knowledge':
            node_type = 'MilvusWithPermissionCheck'
            params = {
                'user_name': self._user_info.user_name,
                'collection_name': [{
                    'key': one
                } for one in self._knowledge_value],  # 知识库id列表
                '_is_check_auth': self._knowledge_auth
            }
        else:
            embeddings = LLMService.get_knowledge_default_embedding()
            if not embeddings:
                raise Exception('没有配置默认的embedding模型')
            file_ids = ["0"]
            for one in self._knowledge_value:
                file_metadata = self.get_other_node_variable(one)
                if not file_metadata:
                    # 未找到对应的临时文件数据, 用户未上传文件
                    continue
                file_ids.append(file_metadata[0]['file_id'])
            self._sort_chunks = len(file_ids) == 1
            node_type = 'Milvus'
            params = {
                'collection_name': self.get_milvus_collection_name(getattr(embeddings, 'model_id')),
                'partition_key': self.workflow_id,
                'embedding': embeddings,
                'metadata_expr': f'file_id in {file_ids}'
            }

        class_obj = import_vectorstore(node_type)
        self._milvus = instantiate_vectorstore(node_type, class_object=class_obj, params=params)

    def init_es(self):
        if self._knowledge_type == 'knowledge':
            node_type = 'ElasticsearchWithPermissionCheck'
            params = {
                'user_name': self._user_info.user_name,
                'index_name': [{
                    'key': one
                } for one in self._knowledge_value],  # 知识库id列表
                '_is_check_auth': self._knowledge_auth
            }
        else:
            file_ids = ["0"]
            for one in self._knowledge_value:
                file_metadata = self.get_other_node_variable(one)
                if not file_metadata:
                    continue
                file_ids.append(file_metadata[0]['file_id'])
            node_type = 'ElasticKeywordsSearch'
            params = {
                'index_name': self.tmp_collection_name,
                'post_filter': {
                    'terms': {
                        'metadata.file_id': file_ids
                    }
                }
            }
        class_obj = import_vectorstore(node_type)
        self._es = instantiate_vectorstore(node_type, class_object=class_obj, params=params)