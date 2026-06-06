import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Phone, Globe, Lock, Shield, Image, ChevronRight, UserPlus, Info } from 'lucide-react';
import Notification from './Notification';

// Common countries for ERP registration
const COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Germany', 'France',
  'India', 'Japan', 'Australia', 'Brazil', 'Singapore', 'South Africa'
];

export default function Signup({ setAuth }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'Procurement Officer',
    country: 'United States',
    additional_info: '',
    password: '',
    confirm_password: ''
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('https://api.dicebear.com/7.x/adventurer/svg?seed=neutral');
  const [selectedPreset, setSelectedPreset] = useState('');
  
  // Password validation indicators
  const [passwordMetrics, setPasswordMetrics] = useState({
    length: false,
    numberOrUpper: false,
    specialChar: false,
    strength: 'weak', // 'weak' | 'medium' | 'strong'
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  
  const navigate = useNavigate();

  // Presets list
  const PRESET_AVATARS = [
    { name: 'Alice', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Alice' },
    { name: 'John', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=John' },
    { name: 'Apex', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Apex' },
    { name: 'Sarah', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sarah' }
  ];

  // Dynamic default avatar if no manual file or preset is selected
  useEffect(() => {
    if (avatarFile || selectedPreset) return;
    
    const seed = formData.first_name || formData.email || 'neutral';
    setAvatarPreview(`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`);
  }, [formData.first_name, formData.email, avatarFile, selectedPreset]);

  // Handle text input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // If password changed, update strength
      if (name === 'password') {
        checkPasswordStrength(value);
      }
      
      return updated;
    });
  };

  // Analyze password strength
  const checkPasswordStrength = (pass) => {
    const metrics = {
      length: pass.length >= 8,
      numberOrUpper: /[0-9A-Z]/.test(pass),
      specialChar: /[^a-zA-Z0-9]/.test(pass),
      strength: 'weak'
    };

    const count = Object.values(metrics).filter(Boolean).length;
    if (count === 4) metrics.strength = 'strong';
    else if (count >= 2) metrics.strength = 'medium';
    else metrics.strength = 'weak';

    setPasswordMetrics(metrics);
  };

  // Handle local file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('Only image files are supported.', 'error');
        return;
      }
      if (file.size > 3 * 1024 * 1024) {
        showToast('Profile image must be under 3MB.', 'error');
        return;
      }
      setAvatarFile(file);
      setSelectedPreset(''); // clear preset
      
      // Generate preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectPreset = (preset) => {
    setAvatarFile(null); // clear uploaded file
    setSelectedPreset(preset.name);
    setAvatarPreview(preset.url);
    showToast(`Selected character preset: ${preset.name}!`, 'success');
  };

  const showToast = (message, type = 'error') => {
    setNotification({ message, type });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.password) {
      showToast('Please complete all mandatory fields.');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      showToast('Passwords do not match.');
      return;
    }

    if (passwordMetrics.strength === 'weak') {
      showToast('Password is too weak. Please review strength checklist.');
      return;
    }

    setIsLoading(true);

    try {
      // Setup multipart FormData to transfer actual file if present
      const submission = new FormData();
      submission.append('first_name', formData.first_name);
      submission.append('last_name', formData.last_name);
      submission.append('email', formData.email);
      submission.append('phone', formData.phone);
      submission.append('role', formData.role);
      submission.append('country', formData.country);
      submission.append('additional_info', formData.additional_info);
      submission.append('password', formData.password);

      if (avatarFile) {
        submission.append('avatar', avatarFile);
      } else if (selectedPreset) {
        // Send selected preset link as alternative
        submission.append('avatar_base64', avatarPreview);
      } else {
        // Send generated dicebear link
        submission.append('avatar_base64', avatarPreview);
      }

      const response = await fetch('http://localhost:5001/api/auth/register', {
        method: 'POST',
        body: submission
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed.');
      }

      // Store credentials & token
      localStorage.setItem('vb_token', data.token);
      localStorage.setItem('vb_user', JSON.stringify(data.user));

      showToast('Account created successfully!', 'success');
      setAuth(data.user, data.token);
      
      // Redirect
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);

    } catch (err) {
      console.error(err);
      showToast(err.message || 'Registration error. Server offline?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-card-wrapper register-mode">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="glass-card auth-form-card">
        <div className="card-title-section">
          <h2 className="card-title gradient-text">Create ERP Account</h2>
          <p className="card-description">Sign up to request role-based procurement access.</p>
        </div>

        <form onSubmit={handleSubmit} className="signup-grid">
          
          {/* LEFT COLUMN: Profile & Demographics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Profile Avatar Upload */}
            <div className="avatar-upload-panel">
              <div className="avatar-preview-wrapper">
                <img
                  src={avatarPreview}
                  alt="Avatar Preview"
                  className="avatar-preview-img"
                />
                <label className="avatar-upload-btn" htmlFor="avatar-file-input">
                  <Image size={14} />
                </label>
                <input
                  id="avatar-file-input"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </div>
              
              <label className="avatar-upload-label" htmlFor="avatar-file-input">
                <span style={{ fontWeight: '600', color: 'var(--color-primary-light)' }}>Click to upload photo</span>
                <div style={{ fontSize: '0.7rem', marginTop: '2px' }}>JPG, PNG under 3MB</div>
              </label>

              {/* Character Presets list */}
              <div style={{ width: '100%', textAlign: 'center' }}>
                <p className="preset-avatars-label">Or Choose Character Preset</p>
                <div className="preset-avatars-list">
                  {PRESET_AVATARS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      className={`preset-avatar-btn ${selectedPreset === preset.name ? 'selected' : ''}`}
                      onClick={() => handleSelectPreset(preset)}
                    >
                      <img src={preset.url} alt={preset.name} className="preset-avatar-img" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Name Fields (Row) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">First Name</label>
                <div className="input-container">
                  <User className="input-icon" size={16} />
                  <input
                    type="text"
                    name="first_name"
                    placeholder="Alice"
                    className="form-input"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Last Name</label>
                <div className="input-container">
                  <User className="input-icon" size={16} />
                  <input
                    type="text"
                    name="last_name"
                    placeholder="Smith"
                    className="form-input"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Email Field */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Email Address</label>
              <div className="input-container">
                <Mail className="input-icon" size={16} />
                <input
                  type="email"
                  name="email"
                  placeholder="name@organization.com"
                  className="form-input"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Phone Field */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Phone Number</label>
              <div className="input-container">
                <Phone className="input-icon" size={16} />
                <input
                  type="tel"
                  name="phone"
                  placeholder="+1 (555) 000-0000"
                  className="form-input"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Role, Security, & Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* User Roles Selection */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">ERP User Role</label>
              <div className="select-container">
                <Shield className="input-icon" size={16} />
                <select
                  name="role"
                  className="form-select"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="Procurement Officer">Procurement Officer (Create RFQs)</option>
                  <option value="Vendor">Vendor (Submit Quotations)</option>
                  <option value="Manager / Approver">Manager / Approver (Authorizations)</option>
                  <option value="Admin">Admin (Full System Manager)</option>
                </select>
                <span className="select-arrow">▼</span>
              </div>
            </div>

            {/* Country Selector */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Country</label>
              <div className="select-container">
                <Globe className="input-icon" size={16} />
                <select
                  name="country"
                  className="form-select"
                  value={formData.country}
                  onChange={handleChange}
                >
                  {COUNTRIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <span className="select-arrow">▼</span>
              </div>
            </div>

            {/* Additional Info / Biography */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Additional Information</label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {formData.additional_info.length}/250 chars
                </span>
              </div>
              <textarea
                name="additional_info"
                placeholder="Brief description of organization or operational role..."
                className="form-textarea"
                maxLength={250}
                value={formData.additional_info}
                onChange={handleChange}
              />
            </div>

            {/* Passwords */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Password</label>
                <div className="input-container">
                  <Lock className="input-icon" size={16} />
                  <input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    className="form-input"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Confirm Password</label>
                <div className="input-container">
                  <Lock className="input-icon" size={16} />
                  <input
                    type="password"
                    name="confirm_password"
                    placeholder="••••••••"
                    className="form-input"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Password Validation Strength Display */}
            {formData.password && (
              <div className="password-strength-container">
                <div className="password-strength-bar">
                  <div className={`password-strength-fill ${passwordMetrics.strength}`} />
                </div>
                
                <ul className="password-rules">
                  <li className={`password-rule-item ${passwordMetrics.length ? 'valid' : ''}`}>
                    <span>{passwordMetrics.length ? '✓' : '•'} At least 8 characters</span>
                  </li>
                  <li className={`password-rule-item ${passwordMetrics.numberOrUpper ? 'valid' : ''}`}>
                    <span>{passwordMetrics.numberOrUpper ? '✓' : '•'} Contain a number or UPPERCASE letter</span>
                  </li>
                  <li className={`password-rule-item ${passwordMetrics.specialChar ? 'valid' : ''}`}>
                    <span>{passwordMetrics.specialChar ? '✓' : '•'} Contain a special symbol (!@#$%)</span>
                  </li>
                </ul>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', gap: '10px', marginTop: 'auto' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="spinner"></div>
                  <span>Creating accounts...</span>
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  <span>Register Account</span>
                </>
              )}
            </button>

          </div>
        </form>

        <div className="form-toggle-link" style={{ marginTop: '30px' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: '600' }}>
            Sign In Instead
          </Link>
        </div>
      </div>
    </div>
  );
}
