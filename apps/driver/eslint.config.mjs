import root from '../../eslint.config.mjs';

const config = [
  { ignores: ['.expo/**', 'dist/**', 'android/**', 'ios/**', 'expo-env.d.ts'] },
  ...root,
  {
    languageOptions: {
      globals: { __DEV__: 'readonly' },
    },
  },
];

export default config;
