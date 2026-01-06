import React from 'react';
import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import DeviceStatusCard from './components/DeviceStatusCard';
import AudioControlCard from './components/AudioControlCard';
import RotaryControlCard from './components/RotaryControlCard';
import CameraDashboard from './components/CameraDashboard';
import AIEndpoint from './components/SiteCleanliness';
// import TrackerMap from './components/GPSTracker';
import { FaCog, FaServer } from 'react-icons/fa';

const App: React.FC = () => {
  return (
    <div className="app-layout">
      <Header />
      <main className="main-content">
        <div className="section-header">
          <FaServer className="section-icon" />
          <div>
            <h2 className="section-title">Device Status</h2>
            <p className="section-subtitle">Monitor your connected devices</p>
          </div>
        </div>
        <div className="grid-container">
          <DeviceStatusCard
            deviceName="PLN"
            deviceType="Power Supply"
            timestamp="Jan 15, 2024 at 09:23 AM"
            status="Active"
            isOperational={true}
          />
          <DeviceStatusCard
            deviceName="Door Panel"
            deviceType="Access Control"
            timestamp="Jan 15, 2024 at 08:45 AM"
            status="Closed"
          />
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
        <div className="grid-container-big">
          <AIEndpoint />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;

