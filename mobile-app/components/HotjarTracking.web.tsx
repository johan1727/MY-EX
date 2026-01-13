import { useEffect } from 'react';

export default function HotjarTracking() {
    useEffect(() => {
        // Inject Hotjar/Contentsquare tracking script
        const script = document.createElement('script');
        script.src = 'https://t.contentsquare.net/uxa/a78f2f478a8be.js';
        script.async = true;
        document.head.appendChild(script);

        return () => {
            // Cleanup on unmount
            if (document.head.contains(script)) {
                document.head.removeChild(script);
            }
        };
    }, []);

    return null;
}
