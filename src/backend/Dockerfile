FROM cr.dataelem.com/dataelement/bisheng-backend:zyrs-0318

WORKDIR /app

COPY ./ ./

RUN poetry config virtualenvs.create false
RUN pip install bisheng_langchain=="1.1.1"
RUN pip install soundfile==0.13.1
RUN pip install tencentcloud-sdk-python-hunyuan==3.0.1394
RUN pip install 'volcengine-python-sdk[ark]'==3.0.11
# RUN pip install --user volcengine==1.0.188
# RUN poetry update --without dev

CMD ["sh entrypoint.sh"]
