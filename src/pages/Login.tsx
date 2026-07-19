import React, { useState } from 'react';
import { KeyRound, ShieldAlert, Sparkles, LogIn } from 'lucide-react';
import { loadEncryptedUser } from '../utils/crypto';
import { saveProfile, UserProfile } from '../db/indexedDb';

interface LoginProps {
  onLoginSuccess: (profile: UserProfile) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedPin = pin.trim();
    if (!trimmedPin) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Load user profile from /users/ decrypted using the PIN
      const decrypted = await loadEncryptedUser(trimmedPin);
      
      // 2. Map decryped payload to UserProfile model
      const profile: UserProfile = {
        id: decrypted.name, // Using name as the unique key
        name: decrypted.name,
        avatar: decrypted.avatar || '',
        pin: trimmedPin,
        streak: 5, // Base default streak matching APK
        totalScore: decrypted.score || 0,
        completedTestsCount: decrypted.totalHistory?.length || 0,
        lastActiveDate: new Date().toISOString().split('T')[0],
        totalHistory: decrypted.totalHistory,
        histHistory: decrypted.histHistory,
        mathHistory: decrypted.mathHistory,
        readHistory: decrypted.readHistory,
        sub1History: decrypted.sub1History,
        sub2History: decrypted.sub2History
      };

      // 3. Save profile to IndexedDB local database
      await saveProfile(profile);
      
      // 4. Fire success callback
      onLoginSuccess(profile);
    } catch (err) {
      console.error(err);
      setError('PIN код қате немесе жүйеде тіркелмегенсіз. Қайта көріңіз.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-[#080710]">
      {/* Decorative Blur Background Blobs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-brand-600 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-pulse"></div>
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-600 rounded-full mix-blend-screen filter blur-[120px] opacity-15"></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 mb-4 animate-bounce">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-brand-300 via-brand-100 to-white">
            ҰБТ ДАЙЫНДЫҚ
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            ҰБТ-ға дайындалуға арналған оқу және тест платформасы
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2 mb-6">
            <KeyRound className="w-5 h-5 text-brand-400" />
            Платформаға кіру
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="pin-input" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Жеке PIN-код
              </label>
              <div className="relative">
                <input
                  id="pin-input"
                  type="password"
                  placeholder="PIN кодыңызды енгізіңіз"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  disabled={loading}
                  maxLength={12}
                  className="w-full px-4 py-3.5 bg-darkBg-input border border-gray-800 rounded-xl text-center text-xl font-mono tracking-[0.4em] text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/35 transition-all"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Дайындық нәтижелерін сақтау және бақылау үшін PIN кодты теріңіз
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs animate-shake">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !pin.trim()}
              className="w-full py-3.5 px-5 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-600 active:scale-[0.98] disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Тексерілуде...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Бастау</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
