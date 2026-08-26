import React, { createContext, useState, useContext, useEffect } from 'react';

const HeaderContext = createContext();

export const HeaderProvider = ({ children }) => {
    const [title, setTitle] = useState('');

    return (
        <HeaderContext.Provider value={{ title, setTitle }}>
            {children}
        </HeaderContext.Provider>
    );
};

export const useHeader = () => useContext(HeaderContext);

export const usePageTitle = (title) => {
    const { setTitle } = useHeader();
    useEffect(() => {
        setTitle(title);
        // Optional: Reset on unmount
        return () => setTitle('');
    }, [title, setTitle]);
};
