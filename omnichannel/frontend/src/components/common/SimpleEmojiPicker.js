import React from 'react';

const EMOJIS = [
    "😀", "😃", "😊", "🥰", "😍", "😎", "🤩", "🤔", "🫡", "🤗",
    "😂", "🤣", "🥲", "😭", "😤", "😡", "🙏", "👍", "👎", "👏",
    "👋", "🤝", "🙌", "🫶", "💪", "👀", "🔥", "✨", "❤️", "🧡",
    "💛", "💚", "💙", "💜", "🤎", "🖤", "🤍", "💔", "❣️", "💕",
    "✅", "❌", "⭕", "🛑", "💯", "💢", "💥", "💫", "💦", "💨",
    "🎉", "🎁", "📦", "🚚", "📞", "📧", "📍", "🗓️", "⏰", "⚠️",
    "⭐", "💰", "💵", "🇮🇩", "📢", "💡", "🔒", "🛒", "💎", "🚀"
];

export default function SimpleEmojiPicker({ onEmojiClick }) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-xl w-[300px] flex flex-col overflow-hidden z-50">
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-100 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase">Select Emoji</span>
            </div>
            <div className="p-2 grid grid-cols-8 gap-1 h-48 overflow-y-auto custom-scrollbar">
                {EMOJIS.map((emoji, idx) => (
                    <button
                        key={idx}
                        onClick={(e) => {
                            e.preventDefault(); // Prevent focus loss if necessary
                            onEmojiClick({ emoji });
                        }}
                        className="hover:bg-indigo-50 p-1.5 rounded text-xl transition-colors flex items-center justify-center cursor-pointer"
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </div>
    );
}
