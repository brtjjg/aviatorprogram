FROM python:3.10-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the source
COPY . .

# Render expects the web service to listen on port 10000 by default
EXPOSE 10000

# Start Gunicorn (as defined in Procfile)
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:10000"]
