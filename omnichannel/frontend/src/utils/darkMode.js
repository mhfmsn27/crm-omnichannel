/**
 * Dark Mode Utilities
 *
 * Provides consistent dark mode color mappings and utilities
 * for the CRMHUB application.
 */

/**
 * Dark mode color mappings for Tailwind
 * Use these in custom components for consistent dark mode support
 */
export const darkModeColors = {
    // Surface colors
    surface: {
        light: 'bg-white',
        dark: 'bg-[#1e293b]', // slate-800
    },

    // Background colors
    background: {
        light: 'bg-gray-50',
        dark: 'bg-gray-950', // slate-950
    },

    // Border colors
    border: {
        light: 'border-gray-200',
        dark: 'border-[#334155]', // slate-700
    },

    // Text colors
    text: {
        primary: {
            light: 'text-gray-900',
            dark: 'text-gray-100',
        },
        secondary: {
            light: 'text-gray-600',
            dark: 'text-gray-400',
        },
        muted: {
            light: 'text-gray-400',
            dark: 'text-gray-500',
        },
    },

    // Interactive colors
    interactive: {
        hover: {
            light: 'hover:bg-gray-100',
            dark: 'dark:hover:bg-slate-800',
        },
        active: {
            light: 'active:bg-gray-200',
            dark: 'dark:active:bg-slate-700',
        },
    },
};

/**
 * Tailwind CSS classes for common dark mode patterns
 */
export const darkModeClasses = {
    // Base element
    element: 'bg-white dark:bg-[#1e293b] text-gray-900 dark:text-gray-100',
    elementElevated: 'bg-white dark:bg-[#1e293b] shadow-sm dark:shadow-none',

    // Cards
    card: 'bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-[#334155] rounded-xl',

    // Inputs
    input: `
        bg-white dark:bg-[#1e293b]
        border border-gray-300 dark:border-[#334155]
        text-gray-900 dark:text-gray-100
        placeholder-gray-400 dark:placeholder-gray-500
        focus:ring-indigo-500 dark:focus:ring-indigo-400
        focus:border-indigo-500 dark:focus:border-indigo-400
    `,

    // Buttons
    buttonPrimary: `
        bg-indigo-600 hover:bg-indigo-700
        dark:bg-indigo-600 dark:hover:bg-indigo-700
        text-white
    `,
    buttonSecondary: `
        bg-gray-100 hover:bg-gray-200
        dark:bg-[#1e293b] dark:hover:bg-[#334155]
        text-gray-900 dark:text-gray-100
    `,
    buttonGhost: `
        bg-transparent hover:bg-gray-100
        dark:hover:bg-[#1e293b]
        text-gray-700 dark:text-gray-300
    `,

    // Dividers
    divider: 'border-gray-200 dark:border-[#334155]',

    // Overlay/Backdrop
    overlay: 'bg-black/50 dark:bg-black/70',

    // Status colors
    status: {
        success: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
        warning: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
        error: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
        info: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
    },
};

/**
 * Get dark mode class helper
 *
 * @param {Object} options
 * @param {string} options.light - Light mode class
 * @param {string} options.dark - Dark mode class
 * @returns {string} Combined dark mode classes
 */
export function darkMode({ light, dark }) {
    return `${light} dark:${dark}`;
}

/**
 * Common component patterns
 */
export const patterns = {
    /**
     * Surface card pattern
     * Use for cards, panels, elevated surfaces
     */
    surface: `
        bg-white dark:bg-[#1e293b]
        border border-gray-200 dark:border-[#334155]
        rounded-xl
    `,

    /**
     * Input pattern
     * Use for text inputs, selects, textareas
     */
    input: `
        bg-white dark:bg-[#1e293b]
        border border-gray-300 dark:border-[#334155]
        text-gray-900 dark:text-gray-100
        placeholder-gray-400 dark:placeholder-gray-500
        focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
        dark:focus:ring-indigo-400 dark:border-indigo-400
    `,

    /**
     * Button base pattern
     * Use for interactive buttons
     */
    button: `
        inline-flex items-center justify-center gap-2
        px-4 py-2 rounded-lg font-semibold
        transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
    `,

    /**
     * Primary button
     */
    buttonPrimary: `
        inline-flex items-center justify-center gap-2
        px-4 py-2 rounded-lg font-semibold
        bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
        text-white
        transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
    `,

    /**
     * Secondary button
     */
    buttonSecondary: `
        inline-flex items-center justify-center gap-2
        px-4 py-2 rounded-lg font-semibold
        bg-gray-100 hover:bg-gray-200 active:bg-gray-300
        dark:bg-[#1e293b] dark:hover:bg-[#334155] dark:active:bg-[#475569]
        text-gray-900 dark:text-gray-100
        transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2
    `,

    /**
     * Ghost button
     */
    buttonGhost: `
        inline-flex items-center justify-center gap-2
        px-4 py-2 rounded-lg font-semibold
        bg-transparent hover:bg-gray-100 active:bg-gray-200
        dark:bg-transparent dark:hover:bg-[#1e293b] dark:active:bg-[#334155]
        text-gray-700 dark:text-gray-300
        transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-gray-400
    `,
};

/**
 * CSS variable based dark mode colors
 * Use these in components that support CSS variables
 */
export const cssVariables = {
    // Background
    '--bg-primary': 'var(--color-bg-light, white)',
    '--bg-secondary': 'var(--color-bg-light-secondary, #f9fafb)',
    '--bg-elevated': 'var(--color-bg-elevated, white)',

    // Text
    '--text-primary': 'var(--color-text-primary, #111827)',
    '--text-secondary': 'var(--color-text-secondary, #6b7280)',
    '--text-muted': 'var(--color-text-muted, #9ca3af)',

    // Border
    '--border': 'var(--color-border, #e5e7eb)',
    '--border-focus': 'var(--color-border-focus, #6366f1)',

    // Interactive
    '--interactive-hover': 'var(--color-interactive-hover, #f3f4f6)',
    '--interactive-active': 'var(--color-interactive-active, #e5e7eb)',
};

export default {
    darkModeColors,
    darkModeClasses,
    darkMode,
    patterns,
    cssVariables,
};
