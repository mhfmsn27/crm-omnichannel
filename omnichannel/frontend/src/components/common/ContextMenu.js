import React, { useEffect, useRef } from 'react';

const ContextMenu = ({ x, y, options, onClose }) => {
    const menuRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };
        // Close on escape
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    // Adjust position if out of viewport (basic implementation)
    const style = {
        top: y,
        left: x,
    };

    return (
        <div
            ref={menuRef}
            className="fixed z-[9999] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
            style={style}
            onClick={(e) => e.stopPropagation()}
        >
            {options.map((option, idx) => {
                if (option.type === 'divider') {
                    return <div key={idx} className="h-px bg-gray-100 dark:bg-gray-700 my-1" />;
                }

                return (
                    <button
                        key={idx}
                        onClick={(e) => {
                            e.stopPropagation();
                            option.onClick();
                            onClose();
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${option.className || 'text-gray-700 dark:text-gray-200'}`}
                        disabled={option.disabled}
                    >
                        {option.icon && <span className="w-4 h-4 text-gray-400 dark:text-gray-500">{option.icon}</span>}
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
};

export default ContextMenu;
