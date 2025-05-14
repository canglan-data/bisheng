#FROM cr.dataelem.com/dataelement/bisheng-backend:zyrs-0318
FROM dataelement/bisheng-backend:v1.1.1
WORKDIR /app

COPY ./ ./

RUN poetry config virtualenvs.create false
#RUN pip install bisheng_langchain==1.1.0 -i https://pypi.tuna.tsinghua.edu.cn/simple
#RUN pip install mcp==1.6.0 -i https://pypi.tuna.tsinghua.edu.cn/simple
#RUN pip install pydantic==1.10.21 -i https://pypi.tuna.tsinghua.edu.cn/simple
# RUN poetry update --without dev

CMD ["sh entrypoint.sh"]
