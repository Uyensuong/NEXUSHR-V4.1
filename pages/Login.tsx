
import React, { useState } from 'react';
import { useAuth, useLanguage } from '../contexts/AppContext';
import { Card, CardContent } from '../components/ui/Card';
import { Mail } from 'lucide-react';

type AuthMode = 'signin' | 'signup' | 'forgot';

export default function Login() {
  const { login, loginViaGmail, signup, forgotPassword } = useAuth();
  const { t, setLanguage, language } = useLanguage();
  
  const [mode, setMode] = useState<AuthMode>('signin');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (mode === 'signin') {
        await login(email, password);
      } else if (mode === 'signup') {
        await signup(email, password, fullName);
        setSuccess(t('registrationSuccess'));
        setMode('signin');
        setEmail('');
        setPassword('');
      } else if (mode === 'forgot') {
        await forgotPassword(email);
        setSuccess(t('resetSent'));
      }
    } catch (err: any) {
      if (err.message === 'ACCOUNT_NOT_APPROVED') {
        setError(t('accountPending'));
      } else {
        setError(err.message);
      }
    }
  };

  const handleGmailLogin = async () => {
    setError('');
    if (!email) {
      setError(t('enterEmailForGmail'));
      return;
    }
    try {
      await loginViaGmail(email);
    } catch (err: any) {
      if (err.message === 'ADMIN_MUST_USE_PASS') {
        setError(t('adminMustUsePass'));
      } else if (err.message === 'ACCOUNT_NOT_APPROVED') {
        setError(t('accountPending'));
      } else {
        setError(err.message);
      }
    }
  };

  const getTitle = () => {
    switch(mode) {
      case 'signin': return t('loginTitle');
      case 'signup': return t('signupTitle');
      case 'forgot': return t('forgotPasswordTitle');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <span className="text-3xl font-bold text-slate-800 tracking-tight">
            NEXUS<span className="text-indigo-500">HR</span>
          </span>
          <div className="mt-2 flex justify-center gap-4 text-sm">
             <button onClick={() => setLanguage('en')} className={language === 'en' ? 'font-bold text-indigo-600' : 'text-slate-500'}>English</button>
             <button onClick={() => setLanguage('vi')} className={language === 'vi' ? 'font-bold text-indigo-600' : 'text-slate-500'}>Tiếng Việt</button>
          </div>
        </div>

        <Card className="border-none shadow-xl">
          <CardContent className="p-8">
            <h2 className="text-xl font-bold text-center mb-6 text-slate-800">
              {getTitle()}
            </h2>

            {mode === 'forgot' && !success && (
              <p className="text-sm text-slate-600 text-center mb-6">
                {t('resetDesc')}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center font-medium">{error}</div>}
              {success && <div className="p-3 bg-green-50 text-green-600 text-sm rounded-lg text-center font-medium">{success}</div>}
              
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('fullName')}</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                  />
                </div>
              )}

              {mode !== 'forgot' || !success ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('email')}</label>
                  <input 
                    type="text" // Changed from email to text to allow "ADMIN"
                    required
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              ) : null}

              {mode !== 'forgot' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('password')}</label>
                  <input 
                    type="password" 
                    required
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
              )}

              {!success && (
                <button 
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
                >
                  {mode === 'signin' ? t('signIn') : mode === 'signup' ? t('signUp') : t('sendResetLink')}
                </button>
              )}

              {/* Gmail / Passwordless Login Button for Employees */}
              {mode === 'signin' && (
                <>
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-slate-500">{t('or')}</span>
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={handleGmailLogin}
                    className="w-full bg-white text-slate-700 border border-slate-300 py-2.5 rounded-lg font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Mail size={18} className="text-red-500" />
                    {t('loginWithGmail')}
                  </button>
                </>
              )}

              {mode === 'signin' && (
                <div className="text-right">
                  <button 
                    type="button"
                    onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    {t('forgotPassword')}
                  </button>
                </div>
              )}
            </form>

            <div className="mt-6 text-center text-sm text-slate-600 space-y-2">
              {mode === 'forgot' ? (
                <button 
                  onClick={() => { setMode('signin'); setError(''); setSuccess(''); }}
                  className="text-indigo-600 font-medium hover:underline"
                >
                  {t('backToLogin')}
                </button>
              ) : (
                <>
                  {mode === 'signin' ? t('noAccount') : t('hasAccount')}{' '}
                  <button 
                    onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setSuccess(''); }}
                    className="text-indigo-600 font-medium hover:underline"
                  >
                    {mode === 'signin' ? t('signUp') : t('signIn')}
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}