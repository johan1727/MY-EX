const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Only use NativeWind in development to avoid Vercel build issues
if (process.env.NODE_ENV !== 'production') {
    module.exports = withNativeWind(config, { input: "./global.css" });
} else {
    module.exports = config;
}
