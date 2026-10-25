import { describe, expect, it } from 'vitest';
import { passwordSchema, resetPasswordSchema, signUpCarrierSchema } from './auth-schemas';

const firstError = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message;

describe('passwordSchema', () => {
  it('accepts a password matching the Supabase policy', () => {
    expect(passwordSchema.safeParse('Atlas-Ride-2026').success).toBe(true);
  });

  it.each([
    ['Short1a', 'passwordTooShort'],
    ['alllowercase123', 'passwordUpper'],
    ['ALLUPPERCASE123', 'passwordLower'],
    ['NoDigitsHereAtAll', 'passwordDigit'],
  ])('rejects %s with %s', (password, code) => {
    expect(firstError(passwordSchema.safeParse(password))).toBe(code);
  });
});

describe('signUpCarrierSchema', () => {
  const valid = {
    fullName: 'Yassine Bouamar',
    legalName: 'Atlas Transport SARL',
    cityId: '6f1c2d3e-4a5b-4c6d-8e9f-0a1b2c3d4e5f',
    email: '  Owner@Atlas.MA ',
    password: 'Atlas-Ride-2026',
    acceptTerms: true,
  };

  it('normalizes the email', () => {
    const parsed = signUpCarrierSchema.parse(valid);
    expect(parsed.email).toBe('owner@atlas.ma');
  });

  it('requires accepting the terms', () => {
    expect(firstError(signUpCarrierSchema.safeParse({ ...valid, acceptTerms: false }))).toBe(
      'acceptTerms',
    );
  });

  it('rejects an invalid email', () => {
    expect(firstError(signUpCarrierSchema.safeParse({ ...valid, email: 'not-an-email' }))).toBe(
      'email',
    );
  });
});

describe('resetPasswordSchema', () => {
  it('requires both passwords to match', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'Atlas-Ride-2026',
      confirmPassword: 'Atlas-Ride-2025',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['confirmPassword']);
    expect(firstError(result)).toBe('passwordMismatch');
  });
});
