import { EXPENSE_CATEGORIES, parseMoneyInput, type ExpenseCategory } from '@mtr/shared';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/auth-provider';
import { Button, Field } from '@/components/ui';
import { flushOfflineQueue, keepPhoto, offlineQueue } from '@/lib/device-queue';
import { supabase } from '@/lib/supabase';
import { cardRadius, colors, radius } from '@/theme';

/** Unique id generated on the phone: replaying the offline queue never duplicates the expense. */
const clientRef = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });

/** Expense with a photo of the receipt, saved even without network (step 19). */
export default function ExpenseScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const router = useRouter();
  const [category, setCategory] = useState<ExpenseCategory>('fuel');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!session) return <Redirect href="/login" />;

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return setError(t('expense.errors.camera'));
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: false });
    if (!result.canceled && result.assets[0]) setPhoto(result.assets[0].uri);
  };

  const save = async () => {
    const cents = parseMoneyInput(amount);
    if (typeof cents !== 'number' || cents <= 0) return setError(t('expense.errors.amount'));
    setBusy(true);
    setError(null);
    const { data: membership } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user.id)
      .eq('role', 'driver')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    if (!membership) {
      setBusy(false);
      return setError(t('expense.errors.unknown'));
    }
    const ref = clientRef();
    await offlineQueue.enqueue({
      kind: 'expense',
      clientRef: ref,
      companyId: membership.company_id,
      category,
      amountCents: cents,
      spentOn: new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca' }).format(
        new Date(),
      ),
      description: note.trim().slice(0, 300),
      tripId: null,
      photoUri: photo ? await keepPhoto(photo, ref) : null,
    });
    await flushOfflineQueue();
    setBusy(false);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('expense.title')}
        </Text>
        <Text style={styles.hint}>{t('expense.offlineHint')}</Text>
        <View style={styles.categories} accessibilityRole="radiogroup">
          {EXPENSE_CATEGORIES.map((value) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ checked: category === value }}
              onPress={() => setCategory(value)}
              style={[styles.chip, category === value && styles.chipActive]}
            >
              <Text style={[styles.chipText, category === value && styles.chipTextActive]}>
                {t(`expense.categories.${value}`)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Field
          label={t('expense.amount')}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />
        <Field label={t('expense.note')} value={note} onChangeText={setNote} maxLength={300} />
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={styles.photo}
            accessibilityLabel={t('expense.photoTaken')}
          />
        ) : null}
        <Button
          variant="ghost"
          label={photo ? t('expense.retakePhoto') : t('expense.takePhoto')}
          onPress={() => void takePhoto()}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
      <View style={styles.footer}>
        <Button label={t('expense.save')} loading={busy} onPress={() => void save()} />
        <Button variant="ghost" label={t('trip.back')} onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 28, fontWeight: '700', color: colors.primary },
  hint: { fontSize: 15, color: colors.muted },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  chipText: { fontSize: 16, color: colors.foreground },
  chipTextActive: { color: colors.surface, fontWeight: '600' },
  photo: { width: '100%', height: 220, borderRadius: cardRadius },
  error: { fontSize: 15, color: colors.danger },
  footer: { padding: 20, gap: 12 },
});
