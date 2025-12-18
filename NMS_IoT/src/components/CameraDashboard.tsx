import React, { useState } from "react";
import "./CameraDashboard.css";
import { FaCameraRetro } from "react-icons/fa";
import Card from "./Card";

const CameraDashboard: React.FC = () => {
  const [ip, setIp] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [connected, setConnected] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  // Di dalam CameraDashboard.tsx
  // const [siteStatus, setSiteStatus] = useState("Unknown");

// Jika ingin mengambil status teks secara terpisah, 
// Anda perlu membuat endpoint API tambahan di Django yang mengembalikan JSON status.
// Tapi cara termudah adalah menampilkannya langsung di dalam frame video (seperti kode di atas).



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


  const sendPTZ = (direction: string) => {
    fetch("http://localhost:8000/ptz/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ direction }),
    });
  };

    const takeScreenshot = async () => {
    const res = await fetch("http://localhost:8000/camera/screenshot/", {
      credentials: "include",
    });

    const data = await res.json();

    if (data.status === "success") {
      setLastCapture("http://localhost:8000" + data.file);
    }
  };

  return (
    <Card className="camera-dashboard">
      <div className="card-header">
        <div className="icon-container audio">
        <FaCameraRetro  />
        </div>
        <div className="title">
        <h2>Camera Dashboard</h2>
        <p className="subtitle">Manage and monitor your IP camera</p>
        </div>
      </div>
      <div className="camera-layout">
        {/* LEFT PANEL */}
        <div className="camera-left">
          <h3>Camera Connection</h3>

          <input
            placeholder="IP Camera"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
          />
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="btn connect" onClick={connectCamera}>
            Connect
          </button>

          <p className="status">{status}</p>
        </div>

        {/* RIGHT PANEL */}
        <div className="camera-right">
          {connected ? (
            <img
                src="http://localhost:8000/stream/"
                className="camera-stream"
                alt="Camera Stream"
            />
            ) : (
            <div className="camera-placeholder">
                Kamera belum terhubung
            </div>
            )}

          <div className="ptz-controls">
            <button onClick={() => sendPTZ("up")}>⬆</button>
            <button onClick={() => sendPTZ("left")}>⬅</button>
            <button onClick={() => sendPTZ("right")}>➡</button>
            <button onClick={() => sendPTZ("down")}>⬇</button>
            <button className="btn capture" onClick={takeScreenshot}>Capture</button>
            <button className="btn view"disabled={!lastCapture}onClick={() => setShowModal(true)}>Lihat Capture</button>
          </div>
        </div>
      </div>
      {showModal && lastCapture && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>
              ✕
            </button>
            <img src={lastCapture} alt="Screenshot" />
          </div>
        </div>
      )}
    </Card>
  );
};

export default CameraDashboard;
