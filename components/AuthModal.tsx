import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './Button';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(false); // Default to register for new users saving
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); 
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { login, register } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let success = false;
      
      // Basic validation
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      if (isLogin) {
        success = await login(email, password);
        if (!success) setError('Invalid email or password.');
      } else {
        if (!name.trim()) {
           setError('Name is required');
           setLoading(false);
           return;
        }
        success = await register(name, email, password);
        if (!success) setError('Failed to create account. Email may be in use.');
      }

      if (success) {
        onSuccess();
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100 border border-gray-100">
        
        {/* Header Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            className={`flex-1 py-4 text-sm font-medium transition-colors ${!isLogin ? 'text-leaf-600 border-b-2 border-leaf-600 bg-leaf-50/50' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => { setIsLogin(false); setError(null); }}
          >
            Create Account
          </button>
          <button
            className={`flex-1 py-4 text-sm font-medium transition-colors ${isLogin ? 'text-leaf-600 border-b-2 border-leaf-600 bg-leaf-50/50' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => { setIsLogin(true); setError(null); }}
          >
            Sign In
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              {isLogin ? 'Welcome Back' : 'Save Your Vision'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {isLogin ? 'Sign in to access your saved projects.' : 'Create a free account to save your design portfolio.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  required={!isLogin}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 border p-2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 border p-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                required
                minLength={6}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 border p-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
                {error}
              </div>
            )}

            <div className="pt-2">
              <Button type="submit" className="w-full" isLoading={loading}>
                {isLogin ? 'Sign In' : 'Create Account & Save'}
              </Button>
            </div>
          </form>
          
          <div className="mt-4 text-center">
            <button 
              onClick={onClose}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
