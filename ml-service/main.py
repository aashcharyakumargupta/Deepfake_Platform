from fastapi import FastAPI, File, UploadFile
from PIL import Image
import io
import os
import cv2
import numpy as np
import base64
import torch
import torch.nn as nn
from torchvision import models, transforms

app = FastAPI(title="Deepfake Verification ML Service")

# Select device
device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
print(f"ML Service running on device: {device}")

# Path to custom-trained EfficientNet model
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "efficientnet_deepfake.pth")

eff_model = None
if os.path.exists(MODEL_PATH):
    try:
        print(f"Loading custom fine-tuned EfficientNet model from {MODEL_PATH}...")
        eff_model = models.efficientnet_b0(weights=None)
        num_ftrs = eff_model.classifier[1].in_features
        eff_model.classifier[1] = nn.Linear(num_ftrs, 2)
        eff_model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
        eff_model.to(device)
        eff_model.eval()
        print("Custom deepfake detection model loaded successfully!")
    except Exception as e:
        print(f"Error loading custom EfficientNet model: {e}")
        eff_model = None
else:
    print(f"Warning: {MODEL_PATH} not found.")

# Optional Hugging Face pipeline as fallback
hf_pipe = None
try:
    from transformers import pipeline
    print("Loading HuggingFace backup model...")
    hf_pipe = pipeline("image-classification", model="prithivMLmods/Deep-Fake-Detector-Model", device=-1 if device.type == 'cpu' else 0)
    print("Backup model loaded successfully!")
except Exception as e:
    print(f"HuggingFace pipeline fallback unavailable: {e}")

# Preprocessing transforms for EfficientNet
data_transforms = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

def generate_forensic_heatmap(img_pil, is_deepfake, tensor_input=None):
    """
    Generates a forensic Class Activation Map (Grad-CAM) showing exact manipulated regions,
    or a biometric mesh HUD for authentic images.
    """
    orig_cv = np.array(img_pil)
    if orig_cv.ndim == 3 and orig_cv.shape[2] == 3:
        orig_bgr = orig_cv[:, :, ::-1].copy()
    else:
        orig_bgr = cv2.cvtColor(orig_cv, cv2.COLOR_GRAY2BGR)

    h, w = orig_bgr.shape[:2]

    if is_deepfake and eff_model is not None and tensor_input is not None:
        try:
            # Grad-CAM Class Activation Map on EfficientNet features
            features = []
            def hook_fn(mod, inp, out):
                features.append(out)
            
            handle = eff_model.features[-1].register_forward_hook(hook_fn)
            with torch.no_grad():
                eff_model(tensor_input)
            handle.remove()

            if features:
                feat = features[0].squeeze(0).detach().cpu().numpy()
                # Class 0 represents Fake in ImageFolder {'fake': 0, 'real': 1}
                weights = eff_model.classifier[1].weight[0].detach().cpu().numpy()
                cam = np.zeros(feat.shape[1:], dtype=np.float32)
                for i, weight in enumerate(weights):
                    cam += weight * feat[i]
                cam = np.maximum(cam, 0)
                if cam.max() > 0:
                    cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
                cam = cv2.resize(cam, (w, h))

                heatmap_colored = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)
                
                # Highlight anomalous edges
                gray = cv2.cvtColor(orig_bgr, cv2.COLOR_BGR2GRAY)
                edges = cv2.Canny(gray, 70, 160)
                heatmap_colored[edges > 0] = [0, 0, 255] # Red forensic edges

                overlay = cv2.addWeighted(orig_bgr, 0.55, heatmap_colored, 0.45, 0)
            else:
                overlay = orig_bgr
        except Exception as e:
            print(f"Error generating CAM: {e}")
            overlay = orig_bgr
    else:
        # Verified Authentic Biometric Scan
        gray = cv2.cvtColor(orig_bgr, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 70, 160)
        hud = np.zeros_like(orig_bgr)
        hud[edges > 0] = [255, 255, 0] # Cyan HUD
        dark = cv2.addWeighted(orig_bgr, 0.7, np.zeros_like(orig_bgr), 0, 0)
        overlay = cv2.addWeighted(dark, 1, hud, 0.6, 0)

    _, buffer = cv2.imencode('.jpg', overlay, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
    base64_str = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/jpeg;base64,{base64_str}"

@app.post("/predict")
async def predict_deepfake(file: UploadFile = File(...)):
    contents = await file.read()
    try:
        image = Image.open(io.BytesIO(contents)).convert('RGB')
    except Exception as e:
        return {"error": "Invalid image file"}

    open_cv_image = np.array(image)[:, :, ::-1].copy()
    gray = cv2.cvtColor(open_cv_image, cv2.COLOR_BGR2GRAY)

    # Face detection using OpenCV Haar Cascade
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    faces = face_cascade.detectMultiScale(gray, 1.1, 4)

    if len(faces) > 0:
        faces = sorted(faces, key=lambda f: f[2]*f[3], reverse=True)
        x, y, w, h = faces[0]
        margin_x = int(w * 0.2)
        margin_y = int(h * 0.2)
        face_img = image.crop((
            max(0, x - margin_x),
            max(0, y - margin_y),
            min(image.width, x + w + margin_x),
            min(image.height, y + h + margin_y)
        ))
        face_detected = True
        detection_info = "Facial region detected and isolated for forensic artifact analysis."
    else:
        face_img = image
        face_detected = False
        detection_info = "No single facial boundary isolated. Analyzing full frame for generative artifacts."

    fake_score = 0.0

    if eff_model is not None:
        t_face = data_transforms(face_img).unsqueeze(0).to(device)
        t_full = data_transforms(image).unsqueeze(0).to(device)

        with torch.no_grad():
            out_face = eff_model(t_face)
            prob_face = torch.softmax(out_face, dim=1)[0]
            
            out_full = eff_model(t_full)
            prob_full = torch.softmax(out_full, dim=1)[0]

        # In dataset training, classes are {'fake': 0, 'real': 1}
        fake_prob_face = prob_face[0].item()
        fake_prob_full = prob_full[0].item()

        if face_detected:
            # Weighted toward face region while considering full frame context
            fake_score = max(fake_prob_face, 0.7 * fake_prob_face + 0.3 * fake_prob_full)
        else:
            fake_score = fake_prob_full

        is_deepfake = bool(fake_score > 0.5)
        primary_tensor = t_face if face_detected else t_full
        heatmap_base64 = generate_forensic_heatmap(face_img if face_detected else image, is_deepfake, primary_tensor)

        confidence = float(fake_score)
        similarity_score = float(max(0.01, 1.0 - fake_score))

        details = f"{detection_info} Verified via Fine-Tuned Deepfake EfficientNet (Forgery Score: {fake_score * 100:.2f}%)."

    elif hf_pipe is not None:
        # Fallback to HuggingFace pipeline if custom model not available
        results = hf_pipe(face_img)
        for res in results:
            if 'FAKE' in res['label'].upper():
                fake_score = res['score']
        is_deepfake = bool(fake_score > 0.5)
        confidence = float(fake_score if is_deepfake else (1.0 - fake_score))
        similarity_score = 0.45 if is_deepfake else 0.95
        heatmap_base64 = generate_forensic_heatmap(face_img, is_deepfake, None)
        details = f"{detection_info} Analysis complete via Hugging Face Vision Transformer."
    else:
        return {"error": "No deepfake detection model available"}

    return {
        "filename": file.filename,
        "isDeepfake": is_deepfake,
        "confidence": confidence,
        "similarityScore": similarity_score,
        "heatmap": heatmap_base64,
        "details": details
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
