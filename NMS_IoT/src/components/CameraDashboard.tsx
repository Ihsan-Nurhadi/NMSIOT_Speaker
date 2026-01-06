import React, { useState, useRef } from "react"; // 1. Tambahkan useRef di sini
import "./CameraDashboard.css";
import { FaCameraRetro, FaExpand } from "react-icons/fa"; // Tambahkan icon expand jika perlu
import Card from "./Card";

const CameraDashboard: React.FC = () => {
  const [ip, setIp] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [connected, setConnected] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const [lastLabel, setLastLabel] = useState<string | null>(null);

  // 2. Buat Ref untuk menargetkan kontainer video
  const videoRef = useRef<HTMLDivElement>(null);

  const connectCamera = async () => {
    const res = await fetch("http://localhost:8000/camera/connect/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ip, username, password }),
    });

    const data = await res.json();
    setStatus(data.message);

    if (res.ok) {
      setConnected(true);
    }
  };

  // 3. Fungsi untuk mengaktifkan Fullscreen
  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const sendPTZ = (direction: string) => {
    fetch("http://localhost:8000/ptz/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ direction }),
    });
  };

  const takeScreenshot = async () => {
    setStatus("Processing classification...");
    const res = await fetch("http://localhost:8000/camera/screenshot/", {
      credentials: "include",
    });

    const data = await res.json();

    if (data.status === "success") {
      // PERBAIKAN: Gunakan data.file_url sesuai backend, bukan data.file
      // Pastikan backend mengembalikan path relatif seperti '/media/screenshots/...'
      setLastCapture("http://localhost:8000" + data.file_url); 
      
      // Sesuaikan label juga jika perlu (di backend saya pakai 'detected_object')
      setLastLabel(data.site_status + " - " + data.detected_object); 
      
      setStatus(`Capture success: ${data.site_status}`);
    } else {
      setStatus("Failed to capture image");
    }
  };

  return (
    <Card className="camera-dashboard">
      <div className="card-header">
        <div className="icon-container audio">
          <FaCameraRetro />
        </div>
        <div className="title">
          <h2>Camera Dashboard</h2>
          <p className="subtitle">Manage and monitor your IP camera</p>
        </div>
      </div>
      <div className="camera-layout">
        <div className="camera-left">
          <h3>Camera Connection</h3>
          <input placeholder="IP Camera" value={ip} onChange={(e) => setIp(e.target.value)} />
          <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="btn connect" onClick={connectCamera}>Connect</button>
          <p className="status">{status}</p>
        </div>

        <div className="camera-right">
          {connected ? (
            /* 4. Bungkus IMG dengan DIV yang memiliki Ref */
            <div className="video-wrapper" ref={videoRef} style={{ position: 'relative' }}>
              <img
                src="http://localhost:8000/stream/"
                className="camera-stream"
                alt="Camera Stream"
              />
              {/* Tombol melayang untuk fullscreen */}
              <button 
                className="fullscreen-icon-btn" 
                onClick={handleFullscreen}
                title="Fullscreen"
              >
                <FaExpand />
              </button>
            </div>
          ) : (
            <div className="camera-placeholder">Kamera belum terhubung</div>
          )}

          <div className="ptz-controls">
            <button onClick={() => sendPTZ("up")}>⬆</button>
            <button onClick={() => sendPTZ("left")}>⬅</button>
            <button onClick={() => sendPTZ("right")}>➡</button>
            <button onClick={() => sendPTZ("down")}>⬇</button>
            <button className="btn capture" onClick={takeScreenshot}>Capture</button>
            <button className="btn view" disabled={!lastCapture} onClick={() => setShowModal(true)}>
              Lihat Capture
            </button>
          </div>
        </div>
      </div>

      {showModal && lastCapture && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            <img src={lastCapture} alt="Screenshot" />
            <div className="capture-label">Hasil: {lastLabel}</div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default CameraDashboard;