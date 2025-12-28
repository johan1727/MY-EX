/**
 * Production-safe logger utility
 * Only logs in development mode
 */

const isDev = __DEV__ || process.env.NODE_ENV === 'development';

export const logger = {
    log: (...args: any[]) => {
        if (isDev) console.log(...args);
    },

    warn: (...args: any[]) => {
        if (isDev) console.warn(...args);
    },

    error: (...args: any[]) => {
        // Always log errors, even in production
        console.error(...args);
    },

    info: (...args: any[]) => {
        if (isDev) console.info(...args);
    },

    debug: (...args: any[]) => {
        if (isDev) console.debug(...args);
    },

    group: (label: string) => {
        if (isDev) console.group(label);
    },

    groupEnd: () => {
        if (isDev) console.groupEnd();
    },

    time: (label: string) => {
        if (isDev) console.time(label);
    },

    timeEnd: (label: string) => {
        if (isDev) console.timeEnd(label);
    }
};

// For backwards compatibility
export default logger;

// Silent no-op logger for production
export const silentLogger = {
    log: () => { },
    warn: () => { },
    error: console.error, // Still log errors
    info: () => { },
    debug: () => { },
    group: () => { },
    groupEnd: () => { },
    time: () => { },
    timeEnd: () => { }
};
