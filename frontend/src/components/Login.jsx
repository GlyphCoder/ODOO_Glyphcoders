import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, ShieldAlert } from 'lucide-react';
import Notification from './Notification';

export default function Login({ setAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('https://api.dicebear.com/7.x/adventurer/svg?seed=neutral');
  
  // Notification states
  const [notification, setNotification] = useState(null);

  const navigate = useNavigate();

  // Dynamic Avatar preview based on email input
  useEffect(() => {
    if (!email) {
      setAvatarPreview('https://api.dicebear.com/7.x/adventurer/svg?seed=neutral');
      return;
    }
    
    // Check if it's one of the seeded emails
    const lowerEmail = email.toLowerCase().trim();
    if (lowerEmail === 'admin@vendorbridge.com') {
      setAvatarPreview('https://api.dicebear.com/7.x/adventurer/svg?seed=Alice');
    } else if (lowerEmail === 'officer@vendorbridge.com') {
      setAvatarPreview('https://api.dicebear.com/7.x/adventurer/svg?seed=John');
    } else if (lowerEmail === 'vendor@vendorbridge.com') {
      setAvatarPreview('https://api.dicebear.com/7.x/adventurer/svg?seed=Apex');
    } else if (lowerEmail === 'manager@vendorbridge.com') {
      setAvatarPreview('https://api.dicebear.com/7.x/adventurer/svg?seed=Sarah');
    } else {
      // Generate dynamically using Dicebear seed
      setAvatarPreview(`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(email)}`);
    }
  }, [email]);

  const showToast = (message, type = 'error') => {
    setNotification({ message, type });
  };

  const handleQuickLogin = (role) => {
    const credentials = {
      Admin: 'admin@vendorbridge.com',
      Officer: 'officer@vendorbridge.com',
      Vendor: 'vendor@vendorbridge.com',
      Manager: 'manager@vendorbridge.com'
    };
    setEmail(credentials[role]);
    setPassword('Password123');
    showToast(`Autofilled ${role} credentials!`, 'success');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      showToast('Please fill in all credentials.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed. Please check credentials.');
      }

      // Store token & user info in localStorage
      localStorage.setItem('vb_token', data.token);
      localStorage.setItem('vb_user', JSON.stringify(data.user));

      showToast('Login successful! Redirecting...', 'success');
      setAuth(data.user, data.token);
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Connection refused. Is backend running?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-card-wrapper">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      
      <div className="glass-card auth-form-card">
        <div className="card-title-section">
          {/* Animated Avatar circle */}
          <div className="flex-center" style={{ marginBottom: '20px' }}>
            <div className="avatar-preview-wrapper" style={{ width: '85px', height: '85px' }}>
              <img
                src={avatarPreview}
                alt="User Avatar Preview"
                className="avatar-preview-img"
              />
            </div>
          </div>
          <h2 className="card-title gradient-text">Sign In</h2>
          <p className="card-description">Welcome back! Access your procurement workspace.</p>
        </div>

        {/* Quick Autofill Selector */}
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <p className="preset-avatars-label" style={{ marginBottom: '8px' }}>Test Accounts Quick Autofill</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {['Admin', 'Officer', 'Vendor', 'Manager'].map(role => (
              <button
                key={role}
                type="button"
                onClick={() => handleQuickLogin(role)}
                className="badge badge-primary"
                style={{ cursor: 'pointer', padding: '6px 12px', border: '1px solid rgba(129, 140, 248, 0.3)' }}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Email Address */}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-container">
              <Mail className="input-icon" size={18} />
              <input
                type="email"
                placeholder="name@organization.com"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Password</label>
            <div className="input-container">
              <Lock className="input-icon" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                className="form-input has-right-icon"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="input-right-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember me & Forgot Password */}
          <div className="form-footer-options">
            <label className="remember-me">
              <input type="checkbox" defaultChecked />
              <span>Remember me</span>
            </label>
            <a href="#forgot" onClick={(e) => {
              e.preventDefault();
              showToast('Password reset link sent to your registered email (simulated).', 'success');
            }}>
              Forgot Password?
            </a>
          </div>

          {/* Login Button */}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', gap: '10px' }} disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="spinner"></div>
                <span>Verifying credentials...</span>
              </>
            ) : (
              <>
                <LogIn size={18} />
                <span>Sign In to ERP</span>
              </>
            )}
          </button>
        </form>

        <div className="form-toggle-link">
          Don't have an account?{' '}
          <Link to="/signup" style={{ fontWeight: '600' }}>
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}
