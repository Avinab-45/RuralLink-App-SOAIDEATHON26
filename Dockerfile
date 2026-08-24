FROM node:22-bookworm-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8000
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend/ ./backend/
COPY data/ ./data/
COPY --from=frontend-build /app/frontend/dist-driver ./frontend/dist-driver
COPY frontend/index.html frontend/app.js frontend/styles.css ./frontend/
EXPOSE 8000
CMD sh -c "cd /app/backend && uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"
