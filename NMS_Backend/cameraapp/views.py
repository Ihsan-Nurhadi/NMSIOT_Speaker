from django.http import JsonResponse ,StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
import json
import os
from django.conf import settings
import cv2
from django.http import HttpResponse
from tests import MODEL
from .tapo_ptz import move_ptz
from datetime import datetime
import time
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .yolomodel import classify_from_endpoint
from ultralytics import YOLO
import numpy as np
import traceback
import requests

MODEL_PATH = os.path.join(settings.BASE_DIR, "weights", "cleanliness.pt") 
try:
    model = YOLO(MODEL_PATH)
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

# Definisi logic bisnis
DIRTY_CLASSES = {"dryleaves", "grass", "tree"}
# ---- PTZ API ----
@csrf_exempt
def ptz_control(request):
    cam = request.session.get("camera")
    if not cam:
        return JsonResponse({"error": "Camera not connected"}, status=400)

    data = json.loads(request.body)
    direction = data.get("direction")

    if direction == "left":
        move_ptz(cam, -0.5, 0)
    elif direction == "right":
        move_ptz(cam, 0.5, 0)
    elif direction == "up":
        move_ptz(cam, 0, 0.5)
    elif direction == "down":
        move_ptz(cam, 0, -0.5)
    else:
        return JsonResponse({"error": "Unknown direction"}, status=400)

    return JsonResponse({"status": "ok", "moved": direction})

camera = None

@csrf_exempt
def connect_camera(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=405)

    data = json.loads(request.body)

    rtsp_url = f"rtsp://{data['username']}:{data['password']}@{data['ip']}:554/stream1"
    cap = cv2.VideoCapture(rtsp_url)

    if not cap.isOpened():
        return JsonResponse({"message": "Failed to connect"}, status=400)

    cap.release()

    # ✅ SIMPAN KE SESSION
    request.session["camera"] = {
        "ip": data["ip"],
        "username": data["username"],
        "password": data["password"],
    }

    return JsonResponse({"message": "Camera connected"})


def video_stream(request):
    cam = request.session.get("camera")
    if not cam:
        return HttpResponse("Camera not connected", status=400)

    rtsp_url = f"rtsp://{cam['username']}:{cam['password']}@{cam['ip']}:554/stream1"
    cap = cv2.VideoCapture(rtsp_url)

    def generate():
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Langsung encode tanpa proses model.predict()
                _, jpeg = cv2.imencode(".jpg", frame)
                yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n")
        finally:
            cap.release()

    return StreamingHttpResponse(generate(), content_type="multipart/x-mixed-replace; boundary=frame")


def camera_screenshot(request):
    # Validasi Session Camera
    cam = request.session.get("camera")
    if not cam: 
        return JsonResponse({"error": "No cam session data"}, status=400)

    if model is None:
        return JsonResponse({"error": "Model AI not loaded properly"}, status=500)

    # Capture RTSP
    # Gunakan stream0 atau stream1 sesuai kebutuhan bandwidth
    rtsp_url = f"rtsp://{cam['username']}:{cam['password']}@{cam['ip']}:554/stream1"
    
    cap = cv2.VideoCapture(rtsp_url)
    if not cap.isOpened():
        return JsonResponse({"error": "Cannot open RTSP stream"}, status=500)

    success, frame = cap.read()
    cap.release() # Segera release setelah capture

    if success:
        frame_for_ai = frame.copy() 

        # =====================================================
        # 3. ROI MASKING (Lakukan pada frame_for_ai saja)
        # =====================================================
        h, w, _ = frame.shape
        x1, y1 = int(0.55 * w), int(0.25 * h)
        x2, y2 = w, h
        
        # Hitamkan HANYA pada frame copy, frame asli tetap bersih
        frame_for_ai[y1:y2, x1:x2] = 0 

        # =====================================================
        # 4. YOLOv8 CLASSIFICATION
        # =====================================================
        # Gunakan frame_for_ai untuk prediksi
        results = model.predict(frame_for_ai, verbose=False) 
        probs = results[0].probs
        
        class_id = probs.top1
        raw_class_name = model.names[class_id].lower() # ambil nama class (lowercase)
        confidence = probs.top1conf.item()


        if raw_class_name in DIRTY_CLASSES:
            final_status = "KOTOR"
            color = (0, 0, 255) # Merah
        else:
            final_status = "BERSIH"
            color = (0, 255, 0) # Hijau

        # Menulis label pada gambar
        label_text = f"Site: {final_status} | Det: {raw_class_name} ({confidence:.1%})"
        cv2.putText(frame, label_text, (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2, cv2.LINE_AA)

        # Setup penyimpanan file
        filename = f"{final_status}_{raw_class_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        save_dir = os.path.join(settings.MEDIA_ROOT, "screenshots")
        
        if not os.path.exists(save_dir):
            os.makedirs(save_dir)
            
        save_path = os.path.join(save_dir, filename)
        
        # Simpan gambar (yang sudah dimasking dan di-annotasi)
        cv2.imwrite(save_path, frame)
        
        # Return JSON Response
        return JsonResponse({
            "status": "success", 
            "file_url": settings.MEDIA_URL + "screenshots/" + filename, 
            "site_status": final_status,    # BERSIH / KOTOR
            "detected_object": raw_class_name,
            "confidence": f"{confidence:.2%}"
        })
    
    return JsonResponse({"error": "Failed to capture frame"}, status=500)

@api_view(["POST"])
def classify_site(request):
    image_url = request.data.get("image_url")

    if not image_url:
        return Response(
            {"error": "image_url wajib diisi"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        result = classify_from_endpoint(image_url)
        return Response(result, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )