import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/auth-provider';
import { Button, LanguageSwitcher } from '@/components/ui';
import { useLocale } from '@/i18n/i18n-provider';
import { flushOfflineQueue } from '@/lib/device-queue';
import { supabase } from '@/lib/supabase';
import { formatDay, formatTime, placeName } from '@/trips/format';
import { useDriverTrips, type DriverTrip } from '@/trips/use-trips';
import { cardRadius, colors } from '@/theme';
import logo from '../../../assets/brand/logos/png/MTR_horizontal_negatif.png';

/** Trips of the next 7 days in chronological order (step 19). */
export default function TodayScreen() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { session } = useAuth();
  const router = useRouter();
  const { trips, loading, failed, reload } = useDriverTrips();

  // Back on this screen: refresh and send what was waiting offline.
  useFocusEffect(
    useCallback(() => {
      void flushOfflineQueue();
      void reload();
    }, [reload]),
  );

  if (!session) return <Redirect href="/login" />;
  const name =
    (session.user.user_metadata.full_name as string | undefined) ?? session.user.email ?? '';

  const renderTrip = ({ item }: { item: DriverTrip }) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/trip/[id]', params: { id: item.id } })}
      style={({ pressed }) => [
        styles.card,
        item.status === 'in_progress' && styles.cardActive,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={styles.cardDay}>{formatDay(item.starts_at, locale)}</Text>
      <Text style={styles.cardTime}>
        {formatTime(item.starts_at, locale)} - {formatTime(item.ends_at, locale)}
      </Text>
      <Text style={styles.cardRoute}>
        {placeName(item.pickup, locale)} / {placeName(item.dropoff, locale)}
      </Text>
      <Text style={styles.cardMeta}>
        {item.passenger_name} · {t('trip.passengers', { count: item.passengers })}
      </Text>
      <Text style={styles.cardStatus}>{t(`trip.status.${item.status}`)}</Text>
    </Pressable>
  );

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
      <FlatList
        contentContainerStyle={styles.content}
        data={trips}
        keyExtractor={(trip) => trip.id}
        renderItem={renderTrip}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void reload()} />}
        ListHeaderComponent={
          <View style={{ gap: 4, marginBottom: 12 }}>
            <Text style={styles.greeting}>{t('today.greeting', { name })}</Text>
            <Text accessibilityRole="header" style={styles.title}>
              {t('today.title')}
            </Text>
            {failed ? <Text style={styles.error}>{t('today.offline')}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          loading ? undefined : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t('today.empty')}</Text>
            </View>
          )
        }
      />
      {/* Actions at the bottom: reachable with one hand (docs/UX.md 4). */}
      <View style={styles.footer}>
        <Button label={t('expense.add')} onPress={() => router.push('/expense')} />
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
  content: { padding: 20, gap: 12 },
  greeting: { fontSize: 17, color: colors.muted },
  title: { fontSize: 28, fontWeight: '700', color: colors.primary },
  error: { fontSize: 15, color: colors.danger },
  card: {
    borderRadius: cardRadius,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 4,
  },
  cardActive: { borderColor: colors.secondary, borderWidth: 2 },
  cardDay: { fontSize: 14, color: colors.muted },
  cardTime: { fontSize: 20, fontWeight: '700', color: colors.foreground },
  cardRoute: { fontSize: 17, color: colors.foreground },
  cardMeta: { fontSize: 15, color: colors.muted },
  cardStatus: { fontSize: 14, fontWeight: '600', color: colors.secondary },
  empty: {
    borderRadius: cardRadius,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 24,
  },
  emptyText: { fontSize: 17, color: colors.foreground, textAlign: 'center' },
  footer: { padding: 20, gap: 12 },
});
