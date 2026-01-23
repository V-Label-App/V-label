import { useState, useEffect } from "react";

interface TypewriterTextProps {
    texts: string[];
    className?: string; // Additional classes
    typingSpeed?: number; // ms per char
    waitTime?: number; // ms to wait before deleting
}

export const TypewriterText = ({
    texts,
    className = "",
    typingSpeed = 100, // Faster typing for smoothness
    waitTime = 2000,
}: TypewriterTextProps) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [textIndex, setTextIndex] = useState(0);

    // Current text to display
    const currentText = texts[textIndex % texts.length];

    // Calculate animation duration
    const duration = (currentText.length * typingSpeed) / 1000; // seconds

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;

        const totalTypingTime = duration * 1000; // ms

        if (!isDeleting) {
            // Wait for typing to finish + waitTime
            timer = setTimeout(() => {
                setIsDeleting(true);
            }, totalTypingTime + waitTime);
        } else {
            // Wait for deleting to finish (+ buffer)
            timer = setTimeout(() => {
                setIsDeleting(false);
                setTextIndex((prev) => (prev + 1) % texts.length);
            }, totalTypingTime + 200);
        }

        return () => clearTimeout(timer);
    }, [isDeleting, textIndex, duration, waitTime, texts.length]);

    return (
        <div className="flex justify-start">
            <h1
                className={`${className} font-mono overflow-hidden border-r-4 border-orange-500 whitespace-nowrap box-content`}
                style={{
                    '--typewriter-width': `${currentText.length}ch`,
                    width: isDeleting ? undefined : '0', // Start at 0 for typing
                    animation: `
                    ${isDeleting ? 'deleting-dynamic' : 'typing-dynamic'} ${duration}s steps(${currentText.length}, end) forwards,
                    blink-caret 0.75s step-end infinite
                `
                } as React.CSSProperties}
            >
                {currentText}
            </h1>
        </div>
    );
};
