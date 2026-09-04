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

// AdminRoute for protecting administrator-only routes (Mock RBAC)
const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('authToken');
  // モック: 実際のアプリではJWTのクレームやAPIから取得しますが、ここではlocalStorageを使用
  const userRole = localStorage.getItem('userRole') || 'ADMIN'; // テスト用にデフォルトADMIN
  
  if (!token) return <Navigate to="/login" replace />;
  if (userRole !== 'ADMIN') {
    alert('管理者権限が必要です。ダッシュボードに戻ります。');
    return <Navigate to="/dashboard" replace />;
  }
  return children;
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
            <AdminRoute>
              <Admin />
            </AdminRoute>
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
            <AdminRoute>
              <AllApplications />
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin-settings" 
          element={
            <AdminRoute>
              <AdminSettings />
            </AdminRoute>
          } 
        />
        <Route 
          path="/users" 
          element={
            <AdminRoute>
              <UserManagement />
            </AdminRoute>
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
