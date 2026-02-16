import React, { useEffect } from 'react';
import { Sparkles, Trophy } from 'lucide-react';

interface BreakthroughAnimationProps {
    message?: string;
    onComplete: () => void;
}

const BreakthroughAnimation: React.FC<BreakthroughAnimationProps> = ({
    message = "Breakthrough!",
    onComplete
}) => {
    useEffect(() => {
        const timer = setTimeout(onComplete, 2500);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />

            <div className="relative z-10 flex flex-col items-center animate-slide-up">
                <div className="relative">
                    <div className="absolute inset-0 bg-brand-500 rounded-full blur-xl opacity-50 animate-pulse" />
                    <div className="bg-gradient-to-br from-brand-400 to-brand-600 p-6 rounded-full shadow-glow text-white mb-4 relative">
                        <Trophy size={48} className="animate-bounce" />
                    </div>
                </div>

                <h2 className="text-4xl font-extra-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-white drop-shadow-lg text-center">
                    {message}
                </h2>

                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    {/* Simple CSS particles could go here, or just rely on the main animation */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-yellow-400 animate-spin-slow opacity-50">
                        <Sparkles size={200} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BreakthroughAnimation;
