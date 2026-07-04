// Extends app.json with values that must come from the environment (.env.local).
// Expo CLI loads .env files before evaluating this, so `npx expo prebuild` /
// `expo run:*` pick up GOOGLE_MAPS_API_KEY without it ever living in app.json.
module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';

  return {
    ...config,
    ios: {
      ...config.ios,
      config: {
        ...config.ios?.config,
        googleMapsApiKey,
      },
    },
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: { apiKey: googleMapsApiKey },
      },
    },
  };
};
