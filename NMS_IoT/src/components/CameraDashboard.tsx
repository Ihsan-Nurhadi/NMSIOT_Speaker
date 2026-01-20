import React, { useState, useRef, useEffect } from "react"; // 1. Tambahkan useRef di sini
import "./CameraDashboard.css";
import { FaCameraRetro, FaExpand, FaBell } from "react-icons/fa"; // Tambahkan icon expand jika perlu
import Card from "./Card";


const CameraDashboard: React.FC = () => {
  const [ip, setIp] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [ip2, setIp2] = useState("");
  const [username2, setUsername2] = useState("");
  const [password2, setPassword2] = useState("");
  const [status, setStatus] = useState("");
  const [connected1, setConnected1] = useState(false);
  const [connected2, setConnected2] = useState(false);
  const videoRef1 = useRef<HTMLDivElement>(null);
  const videoRef2 = useRef<HTMLDivElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const [lastLabel, setLastLabel] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);


  // 2. Buat Ref untuk menargetkan kontainer video
  const videoRef = useRef<HTMLDivElement>(null);

  const connectCamera = async () => {
    const res = await fetch("http://localhost:8000/api/camera/connect/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ip, username, password }),
    });

    const data = await res.json();
    setStatus(data.message);

    if (res.ok) {
      setConnected1(true);
    }
  };
  const connectCamera2 = async () => {
    const res = await fetch("http://localhost:8000/api/camera/connect2/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ip2, username2, password2 }),
    });

    const data = await res.json();
    setStatus(data.message);

    if (res.ok) {
      setConnected2(true);
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

  const sendPTZ1 = (direction: string) => {
    fetch("http://localhost:8000/api/ptz/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ direction }),
    });
  };
  const sendPTZ2 = (direction: string) => {
    fetch("http://localhost:8000/api/ptz2/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ direction }),
    });
  };
  const showToast = (message: string) => {
    setToastMessage(message);
    // Hilangkan otomatis setelah 5 detik
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };
  const takeScreenshot = async () => {
    setStatus("Processing classification...");
    const res = await fetch("http://localhost:8000/api/camera/screenshot/", {
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
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (connected1) {
      interval = setInterval(async () => {
        try {
          const res = await fetch("http://localhost:8000/api/notifications/");
          const data = await res.json();

          if (data.has_alert) {
             // Mencegah toast spam (opsional: logika timestamp di frontend)
             toast.warning(data.message); 
          }
          
          if (data.is_recording) {
              setIsRecording(true);
          } else {
              setIsRecording(false);
          }

        } catch (error) {
          console.error("Error polling notification:", error);
        }
      }, 2000); // Cek setiap 2 detik
    }
    return () => clearInterval(interval);
  }, [connected1]);
  return (
    <Card className="camera-dashboard">
    {toastMessage && (
        <div className="custom-toast">
          <FaBell /> {/* Icon Lonceng */}
          <span>{toastMessage}</span>
        </div>
      )}
      <section className="camera1">
        <div className="card-header">
          <div className="icon-container audio" id="camera-icon">
            <FaCameraRetro />
          </div>
          <div className="title">
            <h2>Camera Dashboard 1</h2>
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
            {connected1 ? (
              /* 4. Bungkus IMG dengan DIV yang memiliki Ref */
              <div className="video-wrapper" ref={videoRef1} style={{ position: 'relative' }}>
                <img
                  src="http://localhost:8000/api/stream/"
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
              <button onClick={() => sendPTZ1("up")}>⬆</button>
              <button onClick={() => sendPTZ1("left")}>⬅</button>
              <button onClick={() => sendPTZ1("right")}>➡</button>
              <button onClick={() => sendPTZ1("down")}>⬇</button>
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
      </section>
      {/* Yang harus dihapus nanti */}
      <hr></hr>
      <section className="camera2">
          <div className="card-header">
          <div className="icon-container audio">
            <FaCameraRetro />
          </div>
          <div className="title">
            <h2>Camera Dashboard 2</h2>
            <p className="subtitle">Manage and monitor your IP camera</p>
          </div>
        </div>
        <div className="camera-layout">
          <div className="camera-left">
            <h3>Camera Connection</h3>
            <input placeholder="IP Camera" value={ip2} onChange={(e) => setIp2(e.target.value)} />
            <input placeholder="Username" value={username2} onChange={(e) => setUsername2(e.target.value)} />
            <input type="password" placeholder="Password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
            <button className="btn connect" onClick={connectCamera2}>Connect</button>
            <p className="status">{status}</p>
          </div>

          <div className="camera-right">
            {connected2 ? (
              /* 4. Bungkus IMG dengan DIV yang memiliki Ref */
              <div className="video-wrapper" ref={videoRef2} style={{ position: 'relative' }}>
                <img
                  src="http://localhost:8000/api/stream2/"
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
                {/* Overlay Recording Indicator */}
                {isRecording && (
                  <div className="recording-indicator">
                    <div className="rec-dot"></div>
                    REC 10s
                  </div>
                )}
              </div>
            ) : (
              <div className="camera-placeholder">Kamera belum terhubung</div>
            )}

            <div className="ptz-controls">
              <button onClick={() => sendPTZ2("up")}>⬆</button>
              <button onClick={() => sendPTZ2("left")}>⬅</button>
              <button onClick={() => sendPTZ2("right")}>➡</button>
              <button onClick={() => sendPTZ2("down")}>⬇</button>
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
      </section>
    </Card>
  );
};

export default CameraDashboard;