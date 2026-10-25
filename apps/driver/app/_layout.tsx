import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/auth/auth-provider';
import { I18nProvider, useLocale } from '@/i18n/i18n-provider';
import { colors } from '@/theme';

void SplashScreen.preventAutoHideAsync();

/** Applies the reading direction to the whole app (Arabic: right-to-left, no restart needed). */
function DirectionRoot({ children }: { children: ReactNode }) {
  const { direction } = useLocale();
  const { loading } = useAuth();

  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync();
  }, [loading]);

  return <View style={{ flex: 1, direction, backgroundColor: colors.background }}>{children}</View>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <DirectionRoot>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }} />
          </DirectionRoot>
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
