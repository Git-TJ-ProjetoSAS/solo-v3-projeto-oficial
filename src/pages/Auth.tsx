import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Mail, Lock, User, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { LOGO_URL } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const emailSchema = z.string().email('E-mail inválido');
const passwordSchema = z.string().min(6, 'A senha deve ter pelo menos 6 caracteres');
const nameSchema = z.string().min(2, 'O nome deve ter pelo menos 2 caracteres');

type AuthMode = 'login' | 'signup';


export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }

    if (mode === 'signup') {
      try {
        nameSchema.parse(fullName);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.fullName = e.errors[0].message;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: 'Credenciais inválidas',
            description: 'E-mail ou senha incorretos. Verifique e tente novamente.',
            variant: 'destructive',
          });
        } else if (error.message.includes('Email not confirmed')) {
          toast({
            title: 'E-mail não confirmado',
            description: 'Por favor, verifique seu e-mail e clique no link de confirmação.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Erro ao entrar',
            description: error.message,
            variant: 'destructive',
          });
        }
        return;
      }

      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso.',
      });
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao tentar entrar.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          toast({
            title: 'Usuário já cadastrado',
            description: 'Este e-mail já está em uso. Tente fazer login.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Erro ao criar conta',
            description: error.message,
            variant: 'destructive',
          });
        }
        return;
      }

      // Se o cadastro foi bem-sucedido e temos uma sessão, redireciona
      if (data.session) {
        toast({
          title: 'Bem-vindo!',
          description: 'Conta criada com sucesso.',
        });
        navigate('/');
      } else {
        // Fallback caso não tenha sessão automática
        toast({
          title: 'Conta criada!',
          description: 'Você já pode fazer login.',
        });
        setMode('login');
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao criar a conta.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      handleLogin();
    } else {
      handleSignup();
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 px-4 flex items-center gap-3 bg-background sticky top-0 z-40 border-b border-border">
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-semibold text-foreground">
          {mode === 'login' ? 'Entrar' : 'Criar Conta'}
        </h1>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8 animate-fade-in">
          {/* Logo */}
          <div className="text-center flex flex-col items-center">
            <img 
              src={LOGO_URL} 
              alt="Solo V3" 
              className="w-[250px] mb-3" 
            />
            <h2 className="text-3xl font-bold tracking-tight mb-1">
              <span className="text-primary">Solo</span>{' '}
              <span style={{ color: 'hsl(142, 70%, 45%)' }}>V3</span>
            </h2>
            <p className="text-muted-foreground text-sm">
              Entre ou cadastre-se para começar
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'signup' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Seu nome completo"
                      className="pl-10"
                      maxLength={100}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-xs text-destructive">{errors.fullName}</p>
                  )}
                </div>

              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="pl-10"
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {mode === 'login' ? 'Entrando...' : 'Criando conta...'}
                </>
              ) : (
                mode === 'login' ? 'Entrar' : 'Criar conta'
              )}
            </Button>
          </form>

          <Separator />

          {/* Toggle Mode */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {mode === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}
            </p>
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm font-medium text-foreground hover:underline mt-1"
            >
              {mode === 'login' ? 'Criar conta' : 'Fazer login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
