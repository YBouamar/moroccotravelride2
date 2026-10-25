import type { ComponentRef, Ref } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useLocale } from '@/i18n/i18n-provider';
import { LOCALES } from '@/i18n/locales';
import { colors, radius, TOUCH_TARGET } from '@/theme';
import { useTranslation } from 'react-i18next';

interface ButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
}

/** Large, one-handed touch target (56 px). Primary: light teal with navy text (5.8:1). */
export function Button({ label, onPress, loading, variant = 'primary' }: ButtonProps) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonGhost,
        pressed && { opacity: 0.85 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.accentForeground} />
      ) : (
        <Text style={[styles.buttonLabel, !primary && { color: colors.foreground }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export type TextInputRef = ComponentRef<typeof TextInput>;

interface FieldProps extends TextInputProps {
  label: string;
  ref?: Ref<TextInputRef>;
}

export function Field({ label, style, ref, ...props }: FieldProps) {
  const { direction } = useLocale();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[styles.input, { textAlign: direction === 'rtl' ? 'right' : 'left' }, style]}
        {...props}
      />
    </View>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <View accessibilityRole="alert" style={styles.error}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation();
  return (
    <View accessibilityLabel={t('language.label')} style={styles.languages}>
      {LOCALES.map((item) => (
        <Pressable
          key={item}
          accessibilityRole="button"
          accessibilityState={{ selected: item === locale }}
          onPress={() => setLocale(item)}
          style={[styles.language, item === locale && styles.languageActive]}
        >
          <Text style={[styles.languageLabel, item === locale && { color: colors.primary }]}>
            {t(`language.names.${item}`)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: TOUCH_TARGET,
    borderRadius: radius,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonGhost: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  buttonLabel: { fontSize: 17, fontWeight: '700', color: colors.accentForeground },
  field: { gap: 6 },
  label: { fontSize: 15, fontWeight: '600', color: colors.foreground },
  input: {
    minHeight: TOUCH_TARGET,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontSize: 17,
    color: colors.foreground,
  },
  error: {
    borderRadius: radius,
    backgroundColor: colors.dangerSurface,
    padding: 12,
  },
  errorText: { color: colors.danger, fontSize: 15 },
  languages: { flexDirection: 'row', gap: 4, justifyContent: 'center' },
  language: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: radius,
  },
  languageActive: { backgroundColor: colors.background },
  languageLabel: { fontSize: 15, color: colors.muted },
});
