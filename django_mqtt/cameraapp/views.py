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

    # 1️⃣ Cek apakah kamera sudah connect
    if not cam:
        return HttpResponse("Camera not connected", status=400)

    rtsp_url = (
        f"rtsp://{cam['username']}:{cam['password']}"
        f"@{cam['ip']}:554/stream1"
    )

    cap = cv2.VideoCapture(rtsp_url)

    # 2️⃣ Cek RTSP berhasil dibuka
    if not cap.isOpened():
        cap.release()
        return HttpResponse("Failed to open RTSP stream", status=500)

    def generate():
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                _, jpeg = cv2.imencode(".jpg", frame)
                frame_bytes = jpeg.tobytes()

                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" +
                    frame_bytes + b"\r\n"
                )

                time.sleep(0.03)  # ⏱️ ~30 FPS (ANTI CPU 100%)
        finally:
            cap.release()  # 3️⃣ WAJIB dilepas

    return StreamingHttpResponse(
        generate(),
        content_type="multipart/x-mixed-replace; boundary=frame"
    )

def camera_screenshot(request):
    cam = request.session.get("camera")
    if not cam:
        return JsonResponse({"error": "Camera not connected"}, status=400)

    rtsp_url = f"rtsp://{cam['username']}:{cam['password']}@{cam['ip']}:554/stream1"

    cap = cv2.VideoCapture(rtsp_url)
    success, frame = cap.read()
    cap.release()

    if not success:
        return JsonResponse({"error": "Gagal ambil gambar"}, status=500)

    save_dir = os.path.join(settings.MEDIA_ROOT, "screenshots")
    os.makedirs(save_dir, exist_ok=True)

    filename = datetime.now().strftime("%Y%m%d_%H%M%S") + ".jpg"
    filepath = os.path.join(save_dir, filename)

    cv2.imwrite(filepath, frame)

    return JsonResponse({
        "status": "success",
        "file": settings.MEDIA_URL + "screenshots/" + filename
    })

