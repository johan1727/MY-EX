const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
    const config = await createExpoWebpackConfigAsync(
        {
            ...env,
            babel: {
                dangerouslyAddModulePathsToTranspile: ['nativewind']
            }
        },
        argv
    );

    // Add aliases to mock native modules for web
    config.resolve.alias = {
        ...config.resolve.alias,
        'react-native-purchases': require.resolve('./mocks/react-native-purchases.js'),
        'expo-local-authentication': require.resolve('./mocks/expo-local-authentication.js'),
        'expo-secure-store': require.resolve('./mocks/expo-secure-store.js'),
    };

    return config;
};
