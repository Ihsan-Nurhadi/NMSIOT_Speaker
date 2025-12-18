from django.http import JsonResponse ,StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
import json
import os
from django.conf import settings
import cv2
from django.http import HttpResponse
from .tapo_ptz import move_ptz
from datetime import datetime
import time
from ultralytics import YOLO

MODEL_PATH = os.path.join(settings.BASE_DIR, "weights", "best.pt") 
model = YOLO(MODEL_PATH)
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

    if not cap.isOpened():
        return HttpResponse("Failed to open RTSP stream", status=500)

    def generate():
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                # --- INTEGRASI YOLO ---
                # Lakukan prediksi pada frame yang sedang aktif
                results = model.predict(frame, verbose=False)
                probs = results[0].probs
                class_id = probs.top1
                class_name = model.names[class_id]
                confidence = probs.top1conf.item()

                # Gambar teks status di atas frame (Opsional)
                color = (0, 255, 0) if "clean" in class_name.lower() else (0, 0, 255)
                label = f"Status: {class_name} ({confidence:.2%})"
                cv2.putText(frame, label, (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 
                            1, color, 2, cv2.LINE_AA)

                # --- ENCODE FRAME ---
                _, jpeg = cv2.imencode(".jpg", frame)
                frame_bytes = jpeg.tobytes()

                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" +
                    frame_bytes + b"\r\n"
                )
                time.sleep(0.01) # Sesuaikan delay
        finally:
            cap.release()

    return StreamingHttpResponse(
        generate(),
        content_type="multipart/x-mixed-replace; boundary=frame"
    )

def camera_screenshot(request):
    cam = request.session.get("camera")
    if not cam: return JsonResponse({"error": "No cam"}, status=400)

    rtsp_url = f"rtsp://{cam['username']}:{cam['password']}@{cam['ip']}:554/stream1"
    cap = cv2.VideoCapture(rtsp_url)
    success, frame = cap.read()
    cap.release()

    if success:
        results = model.predict(frame, verbose=False)
        class_name = model.names[results[0].probs.top1]
        
        # Simpan file dengan nama yang mengandung status
        filename = f"{class_name}_{datetime.now().strftime('%H%M%S')}.jpg"
        save_path = os.path.join(settings.MEDIA_ROOT, "screenshots", filename)
        cv2.imwrite(save_path, frame)
        
        return JsonResponse({"status": "success", "file": settings.MEDIA_URL + "screenshots/" + filename, "label": class_name})
    return JsonResponse({"error": "fail"}, status=500)
