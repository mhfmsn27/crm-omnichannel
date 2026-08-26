import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Pagination - Accessible pagination component
 *
 * @param {Object} props
 * @param {number} props.currentPage - Current page number (1-indexed)
 * @param {number} props.totalPages - Total number of pages
 * @param {Function} props.onPageChange - Page change handler
 * @param {number} props.siblings - Number of sibling pages to show (default: 1)
 * @param {string} props.variant - Style: 'default', 'minimal'
 */
export default function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    siblings = 1,
    variant = 'default',
    className = ''
}) {
    const range = (start, end) => {
        const length = end - start + 1;
        return Array.from({ length }, (_, i) => start + i);
    };

    const getPageNumbers = () => {
        const totalPageNumbers = siblings * 2 + 5; // siblings + first + last + current + 2 dots
        const shouldShowLeftDots = currentPage > siblings + 2;
        const shouldShowRightDots = currentPage < totalPages - siblings - 1;

        if (totalPages <= totalPageNumbers) {
            return range(1, totalPages);
        }

        if (!shouldShowLeftDots && !shouldShowRightDots) {
            return [
                ...range(1, siblings + 2),
                'dots-right'
            ];
        }

        if (shouldShowLeftDots && !shouldShowRightDots) {
            return [
                'dots-left',
                ...range(totalPages - siblings * 2 - 1, totalPages)
            ];
        }

        return [
            1,
            'dots-left',
            ...range(currentPage - siblings, currentPage + siblings),
            'dots-right',
            totalPages
        ];
    };

    const pages = getPageNumbers();

    if (totalPages <= 1) return null;

    const buttonBaseClass = `
        w-9 h-9 flex items-center justify-center rounded-lg
        text-sm font-medium transition-colors
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
    `;

    return (
        <nav
            aria-label="Pagination"
            className={`flex items-center gap-1 ${className}`}
        >
            {/* First Page */}
            <button
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                aria-label="First page"
                className={`${buttonBaseClass} text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700`}
            >
                <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Previous Page */}
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Previous page"
                className={`${buttonBaseClass} text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700`}
            >
                <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Numbers */}
            <div className="hidden sm:flex items-center gap-1">
                {pages.map((page, index) => {
                    if (page === 'dots-left' || page === 'dots-right') {
                        return (
                            <span
                                key={`dots-${index}`}
                                className="w-9 h-9 flex items-center justify-center text-gray-400"
                            >
                                ...
                            </span>
                        );
                    }

                    const isActive = page === currentPage;

                    return (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            aria-label={`Page ${page}`}
                            aria-current={isActive ? 'page' : undefined}
                            className={`
                                ${buttonBaseClass}
                                ${isActive
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                                }
                            `}
                        >
                            {page}
                        </button>
                    );
                })}
            </div>

            {/* Mobile Page Info */}
            <span className="sm:hidden text-sm text-gray-500">
                {currentPage} / {totalPages}
            </span>

            {/* Next Page */}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="Next page"
                className={`${buttonBaseClass} text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700`}
            >
                <ChevronRight className="w-4 h-4" />
            </button>

            {/* Last Page */}
            <button
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                aria-label="Last page"
                className={`${buttonBaseClass} text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700`}
            >
                <ChevronsRight className="w-4 h-4" />
            </button>
        </nav>
    );
}

/**
 * PaginationInfo - Shows pagination summary
 */
export function PaginationInfo({ currentPage, pageSize, totalItems }) {
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalItems);

    return (
        <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing {start} to {end} of {totalItems} results
        </span>
    );
}

/**
 * PerPageSelector - Select items per page
 */
export function PerPageSelector({ value, onChange, options = [10, 25, 50, 100] }) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Per page:</span>
            <select
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="
                    px-2 py-1 rounded-lg border border-gray-200 dark:border-dark-border
                    bg-white dark:bg-dark-surface
                    text-sm text-gray-700 dark:text-gray-300
                    focus:outline-none focus:ring-2 focus:ring-indigo-500
                "
            >
                {options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        </div>
    );
}
