import { Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/auth-provider';
import { Button, LanguageSwitcher } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';
import logo from '../../../assets/brand/logos/png/MTR_horizontal_negatif.png';

/** Day view. The chronological trip list arrives in Phase 4 (driver app). */
export default function TodayScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();
  if (!session) return <Redirect href="/login" />;

  const name =
    (session.user.user_metadata.full_name as string | undefined) ?? session.user.email ?? '';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Image
          source={logo}
          accessibilityLabel={t('brand.name')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.greeting}>{t('today.greeting', { name })}</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {t('today.title')}
        </Text>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('today.empty')}</Text>
        </View>
      </View>
      {/* Actions at the bottom: reachable with one hand (docs/UX.md 4). */}
      <View style={styles.footer}>
        <LanguageSwitcher />
        <Button
          variant="ghost"
          label={t('today.signOut')}
          onPress={() => void supabase.auth.signOut()}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.navy, paddingHorizontal: 20, paddingVertical: 16 },
  logo: { width: 200, height: 38 },
  content: { flex: 1, padding: 20, gap: 8 },
  greeting: { fontSize: 17, color: colors.muted },
  title: { fontSize: 28, fontWeight: '700', color: colors.primary },
  empty: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 24,
  },
  emptyText: { fontSize: 17, color: colors.foreground, textAlign: 'center' },
  footer: { padding: 20, gap: 12 },
});
