FROM python:3.10-slim

# Install Tkinter dependencies (X11 libraries)
RUN apt-get update && apt-get install -y \
    tk \
    x11-apps \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY aviator.py .

# Run the script
CMD ["python", "aviator.py"]
