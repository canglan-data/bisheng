FROM cr.dataelem.com/dataelement/bisheng-backend:zyrs-0318
#FROM dataelement/bisheng-backend:v1.1.1
#FROM docker.io/dataelement/bisheng-backend:base.v2
WORKDIR /app

COPY ./ ./

#RUN pip uninstall -y langgraph langgraph-prebuilt langgraph-checkpoint langgraph-sdk
RUN poetry config repositories.tuna https://pypi.tuna.tsinghua.edu.cn/simple
RUN poetry config virtualenvs.create false
#RUN poetry update --without dev
#RUN pip install bisheng_langchain==1.1.0 -i https://pypi.tuna.tsinghua.edu.cn/simple
#RUN pip install mcp==1.6.0 -i https://pypi.tuna.tsinghua.edu.cn/simple
#RUN pip install pydantic==1.10.21 -i https://pypi.tuna.tsinghua.edu.cn/simple
#RUN pip install celery-redbeat==2.2.0 -i https://pypi.tuna.tsinghua.edu.cn/simple
#RUN pip install langgraph==0.2.37 -i https://pypi.tuna.tsinghua.edu.cn/simple
#RUN patch -p1 < /app/bisheng/patches/langchain_openai.patch /usr/local/lib/python3.10/site-packages/langchain_openai/chat_models/base.py
#RUN patch -p1 < /app/bisheng/patches/fastapi_jwt_auth.patch /usr/local/lib/python3.10/site-packages/fastapi_jwt_auth/config.py

CMD ["sh entrypoint.sh"]
