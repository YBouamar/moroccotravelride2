import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/auth-provider';
import { Button } from '@/components/ui';
import { useLocale } from '@/i18n/i18n-provider';
import { supabase } from '@/lib/supabase';
import { isTracking, startTracking, stopTracking } from '@/lib/tracking';
import { formatDay, formatTime, placeName } from '@/trips/format';
import { getDriverTrip, type DriverTrip } from '@/trips/use-trips';
import { cardRadius, colors } from '@/theme';

/** One trip: details, call the passenger, start (location on) and finish (location off). */
export default function TripScreen() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { session } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [trip, setTrip] = useState<DriverTrip | null>(null);
  const [busy, setBusy] = useState(false);
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    void getDriverTrip(id).then((loaded) => {
      setTrip(loaded);
      // Resume tracking when the app comes back to a trip still in progress.
      if (loaded?.status === 'in_progress')
        void startTracking(loaded.id).then((state) => setTracking(state === 'started'));
      else setTracking(loaded ? isTracking(loaded.id) : false);
    });
  }, [id]);

  if (!session) return <Redirect href="/login" />;
  if (!trip) return <SafeAreaView style={styles.safe} />;

  const setStatus = async (status: 'in_progress' | 'completed') => {
    setBusy(true);
    const { error } = await supabase.rpc('driver_set_trip_status', {
      p_trip: trip.id,
      p_status: status,
    });
    setBusy(false);
    if (error) {
      Alert.alert(
        t('trip.errorTitle'),
        t(error.code ? 'trip.errors.refused' : 'trip.errors.network'),
      );
      return;
    }
    if (status === 'in_progress') {
      const state = await startTracking(trip.id);
      setTracking(state === 'started');
      if (state === 'denied') Alert.alert(t('trip.locationTitle'), t('trip.locationDenied'));
    } else {
      stopTracking();
      setTracking(false);
    }
    setTrip(await getDriverTrip(trip.id));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.day}>{formatDay(trip.starts_at, locale)}</Text>
        <Text accessibilityRole="header" style={styles.time}>
          {formatTime(trip.starts_at, locale)} - {formatTime(trip.ends_at, locale)}
        </Text>
        <Text style={styles.status}>{t(`trip.status.${trip.status}`)}</Text>
        <View style={styles.card}>
          <Text style={styles.label}>{t('trip.pickup')}</Text>
          <Text style={styles.value}>
            {placeName(trip.pickup, locale)} · {trip.pickup_address}
          </Text>
          <Text style={styles.label}>{t('trip.dropoff')}</Text>
          <Text style={styles.value}>
            {placeName(trip.dropoff, locale)} · {trip.dropoff_address}
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>{t('trip.passenger')}</Text>
          <Text style={styles.value}>
            {trip.passenger_name} · {t('trip.passengers', { count: trip.passengers })} ·{' '}
            {t('trip.luggage', { count: trip.luggage })}
          </Text>
          {trip.vehicle ? (
            <Text style={styles.value}>
              {trip.vehicle.registration} · {trip.vehicle.brand} {trip.vehicle.model}
            </Text>
          ) : null}
          {trip.notes ? <Text style={styles.value}>{trip.notes}</Text> : null}
        </View>
        {tracking ? <Text style={styles.tracking}>{t('trip.trackingOn')}</Text> : null}
      </ScrollView>
      <View style={styles.footer}>
        {trip.passenger_phone ? (
          <Button
            variant="ghost"
            label={t('trip.call')}
            onPress={() => void Linking.openURL(`tel:${trip.passenger_phone}`)}
          />
        ) : null}
        {trip.status === 'assigned' ? (
          <Button
            label={t('trip.start')}
            loading={busy}
            onPress={() => void setStatus('in_progress')}
          />
        ) : null}
        {trip.status === 'in_progress' ? (
          <Button
            label={t('trip.complete')}
            loading={busy}
            onPress={() => void setStatus('completed')}
          />
        ) : null}
        <Button variant="ghost" label={t('trip.back')} onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 12 },
  day: { fontSize: 15, color: colors.muted },
  time: { fontSize: 28, fontWeight: '700', color: colors.primary },
  status: { fontSize: 16, fontWeight: '600', color: colors.secondary },
  card: {
    borderRadius: cardRadius,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 6,
  },
  label: { fontSize: 14, color: colors.muted },
  value: { fontSize: 17, color: colors.foreground },
  tracking: { fontSize: 15, color: colors.secondary },
  footer: { padding: 20, gap: 12 },
});
