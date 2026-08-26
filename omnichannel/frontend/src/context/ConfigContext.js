// frontend/src/context/ConfigContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const ConfigContext = createContext(null);

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({
    app_name: 'CRMHub Omnichannel',
    app_logo: null,
    login_banner: null,
    app_favicon: null,
    notification_sound: null,
    feature_flags: {}
  });
  const [activeFeatures, setActiveFeatures] = useState([]); // Stores list of unlocked feature codes
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      const res = await axios.get('/api/public/settings');
      const data = res.data;
      if (!data.app_name || data.app_name === 'Cloudchat.id' || data.app_name === 'Private Cloudchat') {
        data.app_name = 'CRMHub Omnichannel';
      }
      setConfig(prev => ({ ...prev, ...data }));
    } catch (err) {
      console.error("Failed to load system config", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserFeatures = async () => {
    /* PERSONAL VERSION: Disable billing/addons check - unlock all features for internal use
    // Only call if logged in (check handled by axios interceptor or auth context usage)
    try {
      const res = await axios.get('/api/app/billing/addons');

      setActiveFeatures(res.data.active_features || []);
    } catch (e) {
      console.error("[ConfigContext] Failed to fetch features:", e);
      // Silent fail if not logged in
    }
    */
    // PERSONAL VERSION: Unlock all features
    setActiveFeatures([]);
  };

  useEffect(() => {
    fetchConfig();
    // Initial feature fetch attempt
    fetchUserFeatures();
  }, []);

  // Helper: Check if a specific feature code is active for the current user (Plan or Addon)
  const hasFeature = (code) => {
    // PERSONAL VERSION: Unlock All Features
    return true;
    // return activeFeatures.includes(code);
  };

  // Helper: Check if a system-wide flag is disabled (Maintenance Mode)
  const isFeatureDisabled = (key) => {
    const flag = config.feature_flags?.[key];
    return flag && flag.is_active === false;
  };

  const getMaintenanceMessage = (key) => {
    const flag = config.feature_flags?.[key];
    return flag ? flag.message : '';
  };

  return (
    <ConfigContext.Provider value={{
      config,
      refreshConfig: fetchConfig,
      refreshFeatures: fetchUserFeatures, // Call this after payment success
      loading,
      isFeatureDisabled,
      getMaintenanceMessage,
      hasFeature // Usage: hasFeature('feat_chatbot')
    }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => useContext(ConfigContext);
