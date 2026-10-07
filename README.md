# Deepfake Verification Platform

A platform to detect and verify deepfakes using a state-of-the-art vision transformer model.

## Architecture

This repository is composed of three microservices:
- **`backend/`**: Node.js/Express server that connects to MongoDB and handles API requests.
- **`frontend/`**: React application powered by Vite for a fast and dynamic user interface.
- **`ml-service/`**: Python/FastAPI service hosting the deepfake detection model using HuggingFace Transformers and OpenCV.

## Running the Application

### 1. ML Service (Python)
```bash
cd ml-service
python -m venv venv
venv\Scripts\activate  # On Windows
pip install -r requirements.txt  # If applicable
python main.py
```

### 2. Backend (Node.js)
```bash
cd backend
npm install
# Ensure MongoDB is running and update .env if necessary
npm start # or node server.js
```

### 3. Frontend (React/Vite)
```bash
cd frontend
npm install
npm run dev
```
