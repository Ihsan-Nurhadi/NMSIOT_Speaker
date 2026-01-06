from ultralytics import YOLO
from django.conf import settings
import os
import cv2
import numpy as np
import requests

MODEL_PATH = os.path.join(settings.BASE_DIR, "weights", "cleanliness.pt") 

model = YOLO(MODEL_PATH)
DIRTY_CLASSES = {"dryleaves", "grass", "tree"}

def classify_from_endpoint(image_url: str):
    response = requests.get(image_url, timeout=10)
    if response.status_code != 200:
        raise RuntimeError("Gagal mengambil gambar")

    image_array = np.frombuffer(response.content, np.uint8)
    frame = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if frame is None:
        raise RuntimeError("Frame tidak valid")

    # ROI MASKING
    h, w, _ = frame.shape
    x1, y1 = int(0.55 * w), int(0.25 * h)
    frame[y1:h, x1:w] = 0

    # YOLO Classification
    results = model.predict(frame, verbose=False)
    probs = results[0].probs

    class_id = probs.top1
    confidence = float(probs.top1conf)
    class_name = model.names[class_id].lower()

    status = "kotor" if class_name in DIRTY_CLASSES else "bersih"

    return {
        "status": status,
        "class": class_name,
        "confidence": confidence
    }