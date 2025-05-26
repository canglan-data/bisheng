FROM cr.dataelem.com/dataelement/bisheng-backend:zyrs-0318

WORKDIR /app

COPY ./ ./

RUN poetry config virtualenvs.create false
RUN pip install bisheng_langchain=="1.1.1"
RUN pip install soundfile==0.13.1
# RUN poetry update --without dev

CMD ["sh entrypoint.sh"]
