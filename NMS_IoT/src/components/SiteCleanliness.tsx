import { useState } from "react";
import axios from "axios";

type Result = {
  status: "bersih" | "kotor";
  class: string;
  confidence: number;
};

export default function SiteMonitor() {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  const baseImageUrl =
    "http://103.176.44.189:3004/get-image-cam-grass/TJP-04-319-o";

  const imageUrl = `${baseImageUrl}?t=${Date.now()}`;

  const checkSite = async () => {
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:8000/classify/", {
        image_url: baseImageUrl,
      });
      setResult(res.data);
    } catch {
      alert("Gagal cek kebersihan");
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 20, maxWidth: 700 }}>
      <h2>Monitoring Kebersihan Site</h2>

      {/* IMAGE */}
      <img
        src={imageUrl}
        alt="Camera Site"
        style={{
          width: "100%",
          borderRadius: 8,
          border: "1px solid #ccc",
        }}
      />

      {/* BUTTON */}
      <button 
      onClick={checkSite} 
      disabled={loading} 
      style={{ 
        marginTop: 12,
        padding: "10px 15px",
        borderRadius: 5,
        border: "none",
        backgroundColor: "#1976d2",
        color: "white",}}>
        {loading ? "Memproses..." : "Cek Kebersihan"}
      </button>

      {/* RESULT */}
      {result && (
        <div
          style={{
            marginTop: 15,
            padding: 12,
            borderRadius: 8,
            background: result.status === "kotor" ? "#ffebee" : "#e8f5e9",
          }}
        >
          <strong>Status:</strong>{" "}
          {result.status.toUpperCase()} <br />
          <strong>Class:</strong> {result.class} <br />
          <strong>Confidence:</strong>{" "}
          {(result.confidence * 100).toFixed(2)}%
        </div>
      )}
    </div>
  );
}
