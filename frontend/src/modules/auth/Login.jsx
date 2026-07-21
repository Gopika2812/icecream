import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Register State
  const [regData, setRegData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    branchCode: ''
  });

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      const response = await api.post('/auth/login', { username, password });
      if (response.data.success) {
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('user', JSON.stringify(response.data));
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      const response = await api.post('/auth/register', regData);
      if (response.data.success) {
        setSuccessMsg(response.data.message);
        setIsRegistering(false);
        // Clear reg data
        setRegData({ name: '', email: '', username: '', password: '', branchCode: '' });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegChange = (e) => {
    setRegData({ ...regData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/login_bg_icecream.png)' }}
      >
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[6px]"></div>
      </div>

      <div className="glass-panel w-full max-w-md p-8 relative overflow-hidden z-10 shadow-[0_8px_32px_0_rgba(216,27,96,0.4)] !bg-[var(--color-primary)]/90 border-pink-300/30">
        {/* Pink Glow Behind */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[var(--color-primary)] rounded-full blur-[80px] opacity-30 pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[var(--color-primary)] rounded-full blur-[80px] opacity-30 pointer-events-none"></div>
        
        <div className="text-center mb-8 relative z-10 flex flex-col items-center">
          <img src="/logo.avif" alt="Sri Saravanass Logo" className="w-64 h-40 mb-6 rounded-2xl shadow-sm object-cover object-center" />
          <h1 className="text-3xl font-bold text-white tracking-wide">SRI SARAVANASS</h1>
          <p className="text-sm text-pink-100 mt-2 tracking-[0.2em] uppercase">Enterprise ERP</p>
        </div>

        {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg mb-4 text-sm text-center">{error}</div>}
        {successMsg && <div className="bg-green-500/20 border border-green-500/50 text-green-200 p-3 rounded-lg mb-4 text-sm text-center">{successMsg}</div>}

        {!isRegistering ? (
          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Username</label>
              <input 
                type="text" 
                className="glass-input w-full" 
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="glass-input w-full pr-10" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={submitting} className="glass-button w-full mt-8 disabled:opacity-50">
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
            <div className="text-center mt-4">
              <button 
                type="button" 
                onClick={() => { setIsRegistering(true); setError(''); setSuccessMsg(''); }}
                className="text-sm text-pink-100 hover:text-[var(--color-primary)] transition-colors"
              >
                Don't have an account? Register here
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4 relative z-10">
            <div>
              <label className="block text-sm font-medium text-white mb-1">Full Name</label>
              <input required name="name" value={regData.name} onChange={handleRegChange} type="text" className="glass-input w-full" placeholder="John Doe" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-white mb-1">Username</label>
                <input required name="username" value={regData.username} onChange={handleRegChange} type="text" className="glass-input w-full" placeholder="johndoe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Email</label>
                <input required name="email" value={regData.email} onChange={handleRegChange} type="email" className="glass-input w-full" placeholder="john@example.com" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Branch Code</label>
              <input required name="branchCode" value={regData.branchCode} onChange={handleRegChange} type="text" className="glass-input w-full" placeholder="Enter branch code (e.g. ST001)" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Password</label>
              <div className="relative">
                <input 
                  required name="password" value={regData.password} onChange={handleRegChange}
                  type={showPassword ? "text" : "password"} 
                  className="glass-input w-full pr-10" 
                  placeholder="Create a strong password"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={submitting} className="glass-button w-full mt-4 disabled:opacity-50">
              {submitting ? 'Registering...' : 'Register Account'}
            </button>
            <div className="text-center mt-4">
              <button 
                type="button" 
                onClick={() => { setIsRegistering(false); setError(''); setSuccessMsg(''); }}
                className="text-sm text-pink-100 hover:text-[var(--color-primary)] transition-colors"
              >
                Already have an account? Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
