import React, { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { session } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      // Redireciona para a página principal se já houver uma sessão
      navigate('/', { replace: true });
    }
  }, [session, navigate]);

  // Se uma sessão for detectada, o useEffect acima irá redirecionar.
  // Renderiza o formulário de login apenas para usuários não autenticados.
  if (session) {
    return null; // Evita renderizar o formulário brevemente antes do redirecionamento
  }

  return (
    <div className="flex items-center justify-center h-screen bg-background p-4">
      <div className="w-full max-w-md bg-transparent p-8 rounded-xl shadow-none border-none">
        <h1 className="text-2xl font-bold text-center text-text-primary mb-6">Acesso ao Sistema</h1>
        <Auth
          supabaseClient={supabase}
          providers={[]}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(45 100% 50%)', // Cor primária (amarelo)
                  brandAccent: 'hsl(45 100% 40%)', // Cor de hover
                  inputBackground: 'hsl(var(--background))',
                  inputBorder: 'hsl(var(--border))',
                  inputBorderHover: 'hsl(var(--ring))',
                  inputBorderFocus: 'hsl(var(--ring))',
                  inputText: 'hsl(var(--foreground))',
                },
              },
            },
          }}
          theme="light"
          localization={{
            variables: {
              sign_in: {
                email_label: 'Email',
                password_label: 'Senha',
                email_input_placeholder: 'Seu email',
                password_input_placeholder: 'Sua senha',
                button_label: 'Entrar',
                loading_button_label: 'Entrando...',
                social_provider_text: 'Entrar com {{provider}}',
                link_text: 'Já tem uma conta? Entrar',
              },
              sign_up: {
                email_label: 'Email',
                password_label: 'Criar Senha',
                email_input_placeholder: 'Seu email',
                password_input_placeholder: 'Sua senha',
                button_label: 'Cadastrar',
                loading_button_label: 'Cadastrando...',
                link_text: 'Não tem uma conta? Cadastrar',
              },
              forgotten_password: {
                email_label: 'Email',
                email_input_placeholder: 'Seu email',
                button_label: 'Enviar instruções de recuperação',
                loading_button_label: 'Enviando...',
                link_text: 'Esqueceu sua senha?',
              },
              update_password: {
                password_label: 'Nova Senha',
                password_input_placeholder: 'Sua nova senha',
                button_label: 'Atualizar Senha',
                loading_button_label: 'Atualizando...',
              },
            },
          }}
        />
      </div>
    </div>
  );
};

export default Login;