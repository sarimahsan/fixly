import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles.css';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // First, create the account
      await api.signup(email, password, fullName);
      // Redirect to signin with success message
      navigate('/signin', { state: { message: 'Account created — please sign in' } });
    } catch (err) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Left Panel */}
      <motion.div 
        className="auth-hero"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <div className="hero-content">
          <div className="brand-logo mb-6">
            <div className="brand-icon">F</div>
            <span className="brand-name text-4xl">Fixly</span>
          </div>
          <h1 className="hero-title">Intelligent Infrastructure at Scale</h1>
          <p className="hero-subtitle">Join Fixly to automate incident response and maintain high availability across your fleet.</p>
          
        <div className="hero-status mt-12">
            <motion.div 
              className="pulse-dot" 
              style={{ backgroundColor: 'var(--status-emerald)' }}
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <span className="status-text">System Active & Monitoring</span>
          </div>

          <div className="workflow-visualization mt-12">
            <div className="workflow-step">
              <div className="workflow-node detect"></div>
              <span>DETECT</span>
            </div>
            <div className="workflow-line"></div>
            <div className="workflow-step">
              <div className="workflow-node diagnose"></div>
              <span>DIAGNOSE</span>
            </div>
            <div className="workflow-line"></div>
            <div className="workflow-step">
              <div className="workflow-node patch"></div>
              <span>PATCH</span>
            </div>
            <div className="workflow-line"></div>
            <div className="workflow-step">
              <div className="workflow-node recover"></div>
              <span>RECOVER</span>
            </div>
          </div>
        </div>
        <div className="hero-background-blob"></div>
      </motion.div>

      {/* Right Panel */}
      <motion.div 
        className="auth-form-panel"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
      >
        <div className="auth-card">
          <h2 className="auth-title">Create an account</h2>
          <p className="auth-subtitle">Get started with Fixly today</p>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="auth-error-toast"
              >
                {error}
              </motion.div>
            )}

            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="form-input"
                />
                <button 
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary auth-submit-btn"
              disabled={loading}
            >
              {loading ? <Loader2 className="spinner" size={20} /> : 'Create Account'}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account? <Link to="/signin">Sign in</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
