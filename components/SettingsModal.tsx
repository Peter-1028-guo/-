import React, { useState, useEffect } from 'react';
import { LOCAL_STORAGE_API_KEY } from '../constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem(LOCAL_STORAGE_API_KEY) || '';
      setApiKey(storedKey);
    }
  }, [isOpen]);

  const handleSave = () => {
    onSave(apiKey);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#1e2634] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg">Settings</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="p-6 flex flex-col gap-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-white/80 mb-2">
              SiliconFlow API Token
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-black/20 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/80 transition-all placeholder:text-white/30"
            />
            <p className="text-xs text-white/40 mt-2">
              Your token is stored locally in your browser.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 bg-black/10 border-t border-white/10 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-white/70 hover:text-white font-medium transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold transition-colors shadow-lg shadow-primary/20"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
