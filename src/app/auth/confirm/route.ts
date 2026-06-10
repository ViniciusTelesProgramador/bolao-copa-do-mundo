import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Rota de Callback utilizada pelo Supabase Auth para verificar o Magic Link (OTP).
 * Troca o token_hash nos parâmetros da URL pelos cookies de sessão.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type: any = searchParams.get('type');
  const next = searchParams.get('next') ?? '/palpites';

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  redirectTo.searchParams.delete('token_hash');
  redirectTo.searchParams.delete('type');

  if (token_hash && type) {
    const supabase = await createClient();

    // Verifica a OTP enviada via Magic Link
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      redirectTo.searchParams.delete('next');
      return NextResponse.redirect(redirectTo);
    }
  }

  // Redireciona de volta para o login com mensagem de erro caso falhe
  redirectTo.pathname = '/login';
  redirectTo.searchParams.set('error', 'invalid_token');
  return NextResponse.redirect(redirectTo);
}
