import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ExpenseForm from './pages/ExpenseForm';
import Admin from './pages/Admin';
import Calculator from './pages/Calculator';
import MyApplications from './pages/MyApplications';
import AllApplications from './pages/AllApplications';
import AdminSettings from './pages/AdminSettings';
import UserManagement from './pages/UserManagement';
import ApplicationDetail from './pages/ApplicationDetail';
import RecurringPayments from './pages/RecurringPayments';
import ProfileSettings from './pages/ProfileSettings';
import './App.css';

// A simple PrivateRoute component for protecting routes
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('authToken');
  return token ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/apply" 
          element={
            <PrivateRoute>
              <ExpenseForm />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <PrivateRoute>
              <Admin />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/calculator" 
          element={
            <PrivateRoute>
              <Calculator />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/my-applications" 
          element={
            <PrivateRoute>
              <MyApplications />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/all-applications" 
          element={
            <PrivateRoute>
              <AllApplications />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/admin-settings" 
          element={
            <PrivateRoute>
              <AdminSettings />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/users" 
          element={
            <PrivateRoute>
              <UserManagement />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/applications/:id" 
          element={
            <PrivateRoute>
              <ApplicationDetail />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/recurring-payments" 
          element={
            <PrivateRoute>
              <RecurringPayments />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <PrivateRoute>
              <ProfileSettings />
            </PrivateRoute>
          } 
        />
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
