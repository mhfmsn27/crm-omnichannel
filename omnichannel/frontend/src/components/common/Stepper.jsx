import React from 'react';
import { Check, AlertCircle } from 'lucide-react';

/**
 * Step - Step indicator item
 *
 * @param {Object} props
 * @param {number} props.step - Step number
 * @param {string} props.title - Step title
 * @param {boolean} props.isActive - Is current step
 * @param {boolean} props.isCompleted - Is completed
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.disabled - Disabled state
 */
export function Step({
    step,
    title,
    isActive,
    isCompleted,
    onClick,
    disabled = false
}) {
    const bgColor = isActive
        ? 'bg-indigo-600'
        : isCompleted
            ? 'bg-green-500'
            : 'bg-gray-200 dark:bg-slate-700';

    const textColor = isActive
        ? 'text-white'
        : isCompleted
            ? 'text-white'
            : 'text-gray-500 dark:text-gray-400';

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                flex items-center gap-3 p-2 rounded-xl transition-all
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}
            `}
        >
            <div className={`
                w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                ${bgColor} ${textColor}
                transition-colors
            `}
            >
                {isCompleted ? <Check className="w-4 h-4" /> : step}
            </div>
            <span className={`
                text-sm font-medium
                ${isActive
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-500 dark:text-gray-400'}
                hidden sm:block
            `}
            >
                {title}
            </span>
        </button>
    );
}

/**
 * StepConnector - Visual line between steps
 */
export function StepConnector({ completed }) {
    return (
        <div className={`
            flex-1 h-0.5 mx-2 rounded
            ${completed
                ? 'bg-green-500'
                : 'bg-gray-200 dark:bg-slate-700'}
            transition-colors
        `} />
    );
}

/**
 * Stepper - Progress indicator for wizards
 *
 * @param {number} currentStep - Current step number (1-indexed)
 * @param {Function} onStepClick - Navigate to step
 * @param {Array} steps - Array of { title }
 */
export default function Stepper({ currentStep, onStepClick, steps = [] }) {
    return (
        <nav aria-label="Progress" className="flex items-center">
            {steps.map((step, index => {
                const stepNum = index + 1;
                const isActive = currentStep === stepNum;
                const isCompleted = currentStep > stepNum;
                return (
                    <React.Fragment key={stepNum}>
                        <Step
                            step={stepNum}
                            title={step.title}
                            isActive={isActive}
                            isCompleted={isCompleted}
                            onClick={() => onStepClick?.(stepNum)
                            disabled={stepNum > currentStep}
                        />
                        {index < steps.length - 1 && (
                            <StepConnector completed={isCompleted} />
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
}

/**
 * StepContent - Content panel for a step
 *
 * @param {number} currentStep - Current step
 * @param {number} step - This step number
 */
export function StepContent({ currentStep, step, children }) {
    if (currentStep !== step) return null;
    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-200">
            {children}
        </div>
    );
}

/**
 * StepFooter - Navigation buttons for wizard
 *
 * @param {Function} onBack - Back handler
 * @param {Function} onNext - Next handler
 * @param {Function} onSave - Save draft
 */
export function StepFooter({
    onBack,
    onNext,
    onSave,
    isLoading = false,
    nextLabel = 'Next',
    saveLabel = 'Save Draft',
    backLabel = 'Back',
    nextDisabled = false,
    className = ''
}) {
    return (
        <div className={`flex items-center justify-between pt-6 border-t border-gray-100 dark:border-slate-700 ${className}`}>
            {onBack && (
                <button
                    onClick={onBack}
                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                    {backLabel}
                </button>
            )}

            <div className="ml-auto flex items-center gap-3">
                {onSave && (
                    <button
                        onClick={onSave}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        {saveLabel}
                    </button>
                )}

                {onNext && (
                    <button
                        onClick={onNext}
                        disabled={isLoading || nextDisabled}
                        className={`
                            px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700
                            text-white rounded-xl font-semibold text-sm
                            disabled:opacity-50 disabled:cursor-not-allowed
                            flex items-center gap-2 transition-colors
                        `}
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
                                <span>Saving...</span>
                            </>
                        ) : nextLabel}
                    </button>
                )}
            </div>
        </div>
    );
}
