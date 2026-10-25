import { signInSchema } from '@mtr/shared';
import { Redirect } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isActiveDriver, useAuth } from '@/auth/auth-provider';
import { Button, ErrorMessage, Field, LanguageSwitcher, type TextInputRef } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';
import logo from '../../../assets/brand/logos/png/MTR_vertical_couleur.png';

type LoginError = 'invalid' | 'credentials' | 'notDriver' | 'rateLimited' | 'unknown';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const passwordRef = useRef<TextInputRef>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<LoginError | null>(null);
  const [loading, setLoading] = useState(false);

  if (session) return <Redirect href="/today" />;

  async function submit() {
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError('invalid');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword(parsed.data);
      if (authError) {
        setError(authError.status === 429 ? 'rateLimited' : 'credentials');
        return;
      }
      if (!(await isActiveDriver(data.user.id))) {
        await supabase.auth.signOut();
        setError('notDriver');
      }
    } catch {
      setError('unknown');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <LanguageSwitcher />
          <Image
            source={logo}
            accessibilityLabel={t('brand.name')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.title}>
              {t('login.title')}
            </Text>
            <Text style={styles.subtitle}>{t('login.subtitle')}</Text>
            {error ? <ErrorMessage message={t(`login.errors.${error}`)} /> : null}
            <Field
              label={t('login.email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <Field
              ref={passwordRef}
              label={t('login.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
            />
            <Button label={t('login.submit')} onPress={submit} loading={loading} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: 20, gap: 20, justifyContent: 'center' },
  logo: { width: 140, height: 146, alignSelf: 'center' },
  card: { gap: 16, borderRadius: 16, backgroundColor: colors.surface, padding: 20 },
  title: { fontSize: 26, fontWeight: '700', color: colors.primary },
  subtitle: { fontSize: 15, color: colors.muted },
});
