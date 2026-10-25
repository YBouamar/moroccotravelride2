import { Redirect } from 'expo-router';
import { useAuth } from '@/auth/auth-provider';

export default function Index() {
  const { session, loading } = useAuth();
  if (loading) return null;
  return <Redirect href={session ? '/today' : '/login'} />;
}
