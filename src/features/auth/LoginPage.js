import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginUser, selectAuthStatus, selectAuthError, selectAuthToken } from './authSlice';
import './LoginPage.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keyPass, setKeyPass] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const status = useSelector(selectAuthStatus);
  const error = useSelector(selectAuthError);
  const token = useSelector(selectAuthToken);

  useEffect(() => {
    if (token) {
      navigate('/calendar');
    }
  }, [token, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email && password && keyPass) {
      dispatch(loginUser({ email, password, key_pass: keyPass }));
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-header">SPA Booking System</h1>
        {error && (
          <div className="error-message">
            {typeof error === 'string' ? error : error?.message || 'Login failed. Please try again.'}
          </div>
        )}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="key_pass">Key Pass</label>
            <input
              id="key_pass"
              type="password"
              className="form-input"
              value={keyPass}
              onChange={(e) => setKeyPass(e.target.value)}
              required
              placeholder="Enter your key pass"
            />
          </div>
          <button 
            type="submit" 
            className="login-button" 
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;