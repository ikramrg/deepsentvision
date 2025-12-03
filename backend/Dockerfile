FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_DEFAULT_TIMEOUT=300

WORKDIR /app

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --timeout 300 --index-url https://download.pytorch.org/whl/cpu torch==2.1.0 torchvision==0.16.0 \
    && pip install --no-cache-dir --timeout 300 -r requirements.txt

COPY backend/src ./src

ENV DEEPSENTVISION_MODEL_PATH=/app/src/model/deepsentvision_FINAL.pth

EXPOSE 8001

CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8001"]
