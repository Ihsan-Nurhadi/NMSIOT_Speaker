import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import DeviceStatusCard from './components/DeviceStatusCard';
import AudioControlCard from './components/AudioControlCard';
import RotaryControlCard from './components/RotaryControlCard';
import CameraDashboard from './components/CameraDashboard';
import SiteMonitor from './components/SiteCleanliness';
import { FaCog, FaServer, FaBroom } from 'react-icons/fa';

// Komponen untuk Halaman Dashboard Utama
const Dashboard = () => (
  <main className="main-content">
    <div className="section-header">
      <FaServer className="section-icon" />
      <div>
        <h2 className="section-title">Device Status</h2>
        <p className="section-subtitle">Monitor your connected devices</p>
      </div>
    </div>
    <div className="grid-container">
      <DeviceStatusCard deviceName="PLN" deviceType="Power Supply" timestamp="Jan 15, 2024" status="Active" isOperational={true} />
      <DeviceStatusCard deviceName="Door Panel" deviceType="Access Control" timestamp="Jan 15, 2024" status="Closed" />
    </div>

    <div className="section-header">
      <FaCog className="section-icon" />
      <div>
        <h2 className="section-title">Device Control</h2>
        <p className="section-subtitle">Manage your device operations</p>
      </div>
    </div>
    <div className="grid-container">
      <AudioControlCard />
      <RotaryControlCard />
    </div>
    <div className="grid-container-big">
      <CameraDashboard />
    </div>
    
  </main>
);

const App: React.FC = () => {
  return (
    <Router>
      <div className="app-layout">
        <Header />
        
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/cleanliness" element={
            <main className="main-content">
               <SiteMonitor />
            </main>
          } />
        </Routes>

        <Footer />
      </div>
    </Router>
  );
};

export default App;