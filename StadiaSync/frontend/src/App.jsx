import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import CustomerDashboard from './pages/CustomerDashboard';
import AdminHub from './pages/AdminHub';
import VolunteerPortal from './pages/VolunteerPortal';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';

function App() {
  return (
    <>
      <ToastContainer theme="dark" position="bottom-right" hideProgressBar={true} />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/customer-dashboard" element={<CustomerDashboard />} />
          <Route path="/admin-hub" element={<AdminHub />} />
          <Route path="/volunteer-portal" element={<VolunteerPortal />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
