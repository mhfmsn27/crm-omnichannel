import React from 'react';
import Linkify from 'linkify-react';

/**
 * FormatText - Text formatter with bold markdown and linkify support
 *
 * @param {Object} props
 * @param {string} props.text - Text to format
 */
export default function FormatText({ text }) {
    if (!text) return null;

    const lines = text.split('\n');

    return (
        <>
            {lines.map((line, index) => {
                // Split by bold markdown **text**
                const parts = line.split(/(\*\*.*?\*\*)/g);

                return (
                    <div
                        key={index}
                        className={`${line.trim() === '' ? 'h-2' : ''} min-h-[1em]`}
                    >
                        {parts.map((part, i) => {
                            // Bold text
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={i}>{part.slice(2, -2)}</strong>;
                            }

                            // Regular text with linkify
                            return (
                                <Linkify
                                    key={i}
                                    options={{
                                        target: '_blank',
                                        className: 'text-blue-500 hover:underline dark:text-blue-400 break-all'
                                    }}
                                >
                                    {part}
                                </Linkify>
                            );
                        })}
                    </div>
                );
            })}
        </>
    );
}
