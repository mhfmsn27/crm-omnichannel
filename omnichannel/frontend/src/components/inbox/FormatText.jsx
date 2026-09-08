import React from 'react';
import Linkify from 'linkify-react';

/**
 * FormatText - Text formatter with bold markdown, linkify support, and search highlight
 *
 * @param {Object} props
 * @param {string} props.text - Text to format
 * @param {string} [props.highlightTerm] - Optional term to highlight in search
 */
export default function FormatText({ text, highlightTerm }) {
    if (!text) return null;

    const highlightText = (content) => {
        if (!highlightTerm || !highlightTerm.trim() || typeof content !== 'string') return content;
        const q = highlightTerm.trim();
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'gi');
        const chunks = content.split(regex);
        if (chunks.length <= 1) return content;
        return chunks.map((chunk, idx) => 
            chunk.toLowerCase() === q.toLowerCase() ? (
                <mark key={idx} className="bg-yellow-300 dark:bg-yellow-500 text-black px-0.5 rounded font-semibold">
                    {chunk}
                </mark>
            ) : chunk
        );
    };

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
                                return <strong key={i}>{highlightText(part.slice(2, -2))}</strong>;
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
                                    {highlightText(part)}
                                </Linkify>
                            );
                        })}
                    </div>
                );
            })}
        </>
    );
}
