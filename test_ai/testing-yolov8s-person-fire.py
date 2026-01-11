import cv2
import os
from ultralytics import YOLO

# HAPUS BARIS INI KARENA HANYA UNTUK GOOGLE COLAB
# from google.colab.patches import cv2_imshow 

# ================= SETUP PATH OTOMATIS =================
# Mengambil folder tempat script ini berada agar tidak error path
current_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(current_dir, "person-fire.pt")
video_path = os.path.join(current_dir, "ORANG LUAR SITE.mp4")

# ================= LOAD MODEL =================
print(f"Loading model dari: {model_path}")
try:
    model = YOLO(model_path)
except Exception as e:
    print("Error load model:", e)
    exit()

# ================= LOAD VIDEO =================
print(f"Membuka video dari: {video_path}")
cap = cv2.VideoCapture(video_path)

if not cap.isOpened():
    print("❌ ERROR: Video tidak ditemukan atau tidak bisa dibuka!")
    print("Pastikan nama file 'ORANG LUAR SITE.mp4' benar dan ada di folder yang sama.")
    exit()

# ================= PARAMETER =================
MAX_SECONDS = 10
FRAME_INTERVAL = 0.3
MIN_DETECTION = 3
MAX_SHOWN = 3

# ================= STORAGE =================
person_frames = []
fire_frames = []
both_frames = []
clear_frame = None

person_count = 0
fire_count = 0

# ================= PROSES VIDEO =================
print("Sedang memproses video...")
current_time = 0.0

while cap.isOpened() and current_time < MAX_SECONDS:
    cap.set(cv2.CAP_PROP_POS_MSEC, current_time * 1000)

    ret, frame = cap.read()
    if not ret:
        break

    results = model(frame, conf=0.2, verbose=False)
    result = results[0]

    has_person = False
    has_fire = False

    if result.boxes is not None:
        for box in result.boxes:
            cls = int(box.cls)
            conf = float(box.conf)
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            label = model.names[cls].lower()

            if label == "person":
                has_person = True
                person_count += 1
                color = (0, 255, 0) # Hijau
                text = f"Person {conf:.2f}"
            elif label == "fire":
                has_fire = True
                fire_count += 1
                color = (0, 0, 255) # Merah
                text = f"Fire {conf:.2f}"
            else:
                continue

            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame, text, (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

    # ===== SIMPAN FRAME BERURUT =====
    if has_person and has_fire:
        both_frames.append((current_time, frame.copy()))
    elif has_person:
        person_frames.append((current_time, frame.copy()))
    elif has_fire:
        fire_frames.append((current_time, frame.copy()))
    elif clear_frame is None:
        clear_frame = (current_time, frame.copy())

    current_time += FRAME_INTERVAL

cap.release()

# ================= STATUS FINAL =================
if person_count >= MIN_DETECTION and fire_count >= MIN_DETECTION:
    final_status = "FIRE AND PERSON DETECTED"
    selected_frames = both_frames
elif person_count >= MIN_DETECTION:
    final_status = "PERSON DETECTED"
    selected_frames = person_frames
elif fire_count >= MIN_DETECTION:
    final_status = "FIRE DETECTED"
    selected_frames = fire_frames
else:
    final_status = "CLEAR"
    selected_frames = []

print("\nFINAL STATUS:", final_status)

# ================= DRAW STATUS =================
def draw_status(frame, status):
    font = cv2.FONT_HERSHEY_SIMPLEX
    scale = 1.0
    thickness = 3
    margin = 20
    (tw, th), _ = cv2.getTextSize(status, font, scale, thickness)
    h, w = frame.shape[:2]
    x = w - tw - margin
    y = margin + th
    cv2.putText(frame, status, (x, y), font, scale, (255, 255, 255), thickness)

# ================= TAMPILKAN FRAME FINAL (VERSI LOKAL) =================
if final_status == "CLEAR":
    if clear_frame is not None:
        draw_status(clear_frame[1], "CLEAR")
        cv2.imshow("Result - CLEAR", clear_frame[1]) # GANTI cv2_imshow
        print("Tekan tombol apapun di keyboard untuk menutup gambar...")
        cv2.waitKey(0) # TAHAN GAMBAR
else:
    # ambil frame TERAKHIR
    selected_frames = sorted(selected_frames, key=lambda x: x[0])[-MAX_SHOWN:]

    for i, (t, frame) in enumerate(selected_frames):
        draw_status(frame, final_status)
        window_name = f"Result {i+1} - {final_status}"
        cv2.imshow(window_name, frame) # GANTI cv2_imshow

    print("Tekan tombol apapun di keyboard untuk menutup semua gambar...")
    cv2.waitKey(0) # TAHAN GAMBAR (PENTING!)

cv2.destroyAllWindows()