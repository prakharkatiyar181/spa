import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectAuthToken } from './features/auth/authSlice';
import LoginPage from './features/auth/LoginPage';
import CalendarContainer from './features/calendar/CalendarContainer';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const token = useSelector(selectAuthToken);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/calendar" 
            element={
              <ProtectedRoute>
                <CalendarContainer />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/calendar" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;