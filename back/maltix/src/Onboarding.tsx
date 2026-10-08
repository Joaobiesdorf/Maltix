import { useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowRight, Beer, Check, ChevronRight, CircleCheck, Factory, FlaskConical,
  Gauge, Leaf, LockKeyhole, Mail, ShieldCheck, Sparkles, Users,
} from 'lucide-react';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, isFirebaseConfigured } from './biesdorf/firebase';

export interface DemoUser {
  name: string;
  email: string;
  breweryName: string;
  canAccessBiesdorf: boolean;
}

type Stage = 'home' | 'signin' | 'signup' | 'brewery';

export default function Onboarding({ onEnterApp }: { onEnterApp: (user: DemoUser) => void }) {
  const [stage, setStage] = useState<Stage>('home');
  const [account, setAccount] = useState({ name: '', email: '' });
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  function enterWithAccount(name: string, email: string, breweryName = 'Cervejaria de demonstração', canAccessBiesdorf = false) {
    onEnterApp({ name, email, breweryName, canAccessBiesdorf });
  }

  function firebaseError(error: unknown) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
    const messages: Record<string, string> = {
      'auth/invalid-credential': 'E-mail ou senha incorretos. Confira seus dados e tente novamente.',
      'auth/user-not-found': 'Não encontramos uma conta com este e-mail.',
      'auth/wrong-password': 'Senha incorreta. Confira e tente novamente.',
      'auth/email-already-in-use': 'Este e-mail já possui uma conta. Faça login.',
      'auth/weak-password': 'A senha precisa ter pelo menos 8 caracteres.',
      'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco antes de tentar novamente.',
      'auth/network-request-failed': 'Não foi possível conectar. Verifique sua internet e tente novamente.',
      'auth/operation-not-allowed': 'O login por e-mail e senha precisa ser habilitado no Firebase Authentication.',
    };
    return messages[code] ?? 'Não foi possível autenticar sua conta. Tente novamente.';
  }

  async function submitSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email')).trim();
    const password = String(form.get('password'));
    const name = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Cervejeiro';
    if (!auth || !isFirebaseConfigured) {
      setNotice('O Firebase não está configurado. Defina as variáveis VITE_FIREBASE_* usadas pela Cervejaria Biesdorf.');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      enterWithAccount(credential.user.displayName || name, credential.user.email || email, 'Cervejaria Biesdorf', true);
    } catch (error) {
      setNotice(firebaseError(error));
    } finally {
      setBusy(false);
    }
  }

  function submitSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name')).trim();
    const email = String(form.get('email')).trim();
    const password = String(form.get('password'));
    const confirmation = String(form.get('confirmation'));
    if (password !== confirmation) {
      setNotice('As senhas não coincidem. Confira os campos e tente novamente.');
      return;
    }
    setAccount({ name, email });
    setNotice('');
    setStage('brewery');
  }

  function submitBrewery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    enterWithAccount(account.name, account.email, String(form.get('breweryName')).trim());
  }

  async function resetPassword(form: HTMLFormElement | null) {
    const email = String(new FormData(form ?? undefined).get('email') ?? '').trim();
    if (!email) {
      setNotice('Informe seu e-mail para receber o link de recuperação.');
      return;
    }
    if (!auth || !isFirebaseConfigured) {
      setNotice('O Firebase não está configurado. Defina as variáveis VITE_FIREBASE_* usadas pela Cervejaria Biesdorf.');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      await sendPasswordResetEmail(auth, email);
      setNotice('Enviamos um link de recuperação para o seu e-mail.');
    } catch (error) {
      setNotice(firebaseError(error));
    } finally {
      setBusy(false);
    }
  }

  function showSignUp() {
    setNotice('');
    setStage('signup');
  }

  function showSignIn() {
    setNotice('');
    setStage('signin');
  }

  return (
    <main className="onboarding">
      <header className="public-header">
        <a className="public-brand" href="#inicio" onClick={(event) => { event.preventDefault(); setStage('home'); }}>
          <span className="public-brand-mark"><Beer size={21} /></span>
          <span>maltix<span className="brand-period">.</span></span>
        </a>
        {stage === 'home' ? (
          <nav className="public-nav" aria-label="Navegação principal">
            <a href="#plataforma">Plataforma</a>
            <a href="#para-quem">Para sua cervejaria</a>
            <button className="public-link-button" onClick={showSignIn}>Entrar</button>
            <button className="public-button public-button-dark" onClick={showSignUp}>Começar agora <ArrowRight size={15} /></button>
          </nav>
        ) : (
          <button className="public-back-link" onClick={() => setStage('home')}>Voltar para o início</button>
        )}
      </header>

      {stage === 'home' && <Landing onSignIn={showSignIn} onSignUp={showSignUp} />}
      {stage === 'signin' && <AuthLayout title="Bom ter você de volta." subtitle="Entre no seu espaço e acompanhe sua operação.">
        <form className="public-form" onSubmit={submitSignIn}>
          <Field label="E-mail" icon={<Mail size={16} />}><input name="email" type="email" autoComplete="email" placeholder="voce@sua cervejaria.com.br" required /></Field>
          <Field label="Senha" icon={<LockKeyhole size={16} />}><input name="password" type="password" autoComplete="current-password" minLength={8} placeholder="Sua senha" required /></Field>
          <button className="forgot-link" type="button" disabled={busy} onClick={(event) => resetPassword(event.currentTarget.form)}>Esqueceu a senha?</button>
          {notice && <p className="form-notice" role="status">{notice}</p>}
          <button className="public-button public-button-dark public-submit" type="submit" disabled={busy}>{busy ? 'Entrando...' : 'Entrar'} <ArrowRight size={16} /></button>
        </form>
        <p className="auth-switch">Ainda não tem conta? <button onClick={showSignUp}>Criar espaço de demonstração</button></p>
        <DemoNotice mode="signin" />
      </AuthLayout>}
      {stage === 'signup' && <AuthLayout title="Sua próxima brassagem começa aqui." subtitle="Crie seu acesso e configure o espaço da sua cervejaria.">
        <form className="public-form" onSubmit={submitSignUp}>
          <Field label="Seu nome"><input name="name" autoComplete="name" placeholder="Como podemos chamar você?" required /></Field>
          <Field label="E-mail de trabalho" icon={<Mail size={16} />}><input name="email" type="email" autoComplete="email" placeholder="voce@sua cervejaria.com.br" required /></Field>
          <Field label="Crie uma senha" icon={<LockKeyhole size={16} />}><input name="password" type="password" autoComplete="new-password" minLength={8} placeholder="Mínimo de 8 caracteres" required /></Field>
          <Field label="Confirme sua senha" icon={<LockKeyhole size={16} />}><input name="confirmation" type="password" autoComplete="new-password" minLength={8} placeholder="Digite sua senha novamente" required /></Field>
          {notice && <p className="form-notice" role="alert">{notice}</p>}
          <button className="public-button public-button-dark public-submit" type="submit" disabled={busy}>{busy ? 'Criando conta...' : 'Continuar'} <ArrowRight size={16} /></button>
        </form>
        <p className="auth-switch">Já tem uma conta? <button onClick={showSignIn}>Fazer login</button></p>
        <DemoNotice mode="signup" />
      </AuthLayout>}
      {stage === 'brewery' && <AuthLayout title="Conte pra gente sobre sua cervejaria." subtitle="Vamos deixar seu espaço de trabalho com a cara da sua operação." step>
        <form className="public-form" onSubmit={submitBrewery}>
          <Field label="Nome da cervejaria"><input name="breweryName" autoComplete="organization" placeholder="Ex.: Cervejaria Serra Alta" required /></Field>
          <Field label="Razão social"><input name="legalName" autoComplete="organization" placeholder="Nome registrado da empresa" required /></Field>
          <div className="public-form-row">
            <Field label="CNPJ"><input name="document" inputMode="numeric" placeholder="00.000.000/0001-00" required /></Field>
            <Field label="Estado"><select name="state" defaultValue="" required><option value="" disabled>UF</option>{['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map((state) => <option key={state}>{state}</option>)}</select></Field>
          </div>
          <Field label="Cidade"><input name="city" autoComplete="address-level2" placeholder="Sua cidade" required /></Field>
          <Field label="Tamanho da operação"><select name="volume" defaultValue="" required><option value="" disabled>Selecione uma faixa</option><option>Até 1.000 L/mês</option><option>1.000 a 5.000 L/mês</option><option>5.000 a 20.000 L/mês</option><option>Acima de 20.000 L/mês</option></select></Field>
          <label className="public-checkbox"><input type="checkbox" required /><span>Autorizo criar um espaço Maltix de demonstração local. Os dados desta etapa não serão gravados.</span></label>
          {notice && <p className="form-notice" role="alert">{notice}</p>}
          <button className="public-button public-button-dark public-submit" type="submit">Criar espaço de demonstração <ArrowRight size={16} /></button>
        </form>
        <DemoNotice mode="signup" />
      </AuthLayout>}

      <footer className="public-footer">
        <a className="public-brand footer-brand" href="#inicio" onClick={(event) => { event.preventDefault(); setStage('home'); }}><span className="public-brand-mark"><Beer size={18} /></span><span>maltix<span className="brand-period">.</span></span></a>
        <span>Feito para quem transforma malte em boas histórias.</span>
        <span>© 2026 Maltix</span>
      </footer>
    </main>
  );
}

function Landing({ onSignIn, onSignUp }: { onSignIn: () => void; onSignUp: () => void }) {
  return <>
    <section className="hero-section" id="inicio">
      <div className="hero-copy">
        <span className="hero-kicker"><Sparkles size={14} /> O próximo nível da gestão cervejeira</span>
        <h1>Sua cervejaria,<br />no <span>ponto certo.</span></h1>
        <p>Da brassagem ao pedido entregue: tudo o que acontece na sua cervejaria, organizado em um só lugar.</p>
        <div className="hero-actions">
          <button className="public-button public-button-amber" onClick={onSignUp}>Comece grátis <ArrowRight size={16} /></button>
          <button className="hero-secondary" onClick={onSignIn}>Já tenho uma conta <ChevronRight size={16} /></button>
        </div>
        <div className="hero-proof"><div className="proof-avatars"><span>R</span><span>M</span><span>A</span></div><p><strong>Feito para quem vive a cerveja</strong><small>Gestão simples, do tanque ao cliente.</small></p></div>
      </div>
      <div className="hero-visual" role="img" aria-label="Prévia do painel de gestão Maltix">
        <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
        <div className="visual-beer-badge"><Beer size={29} /></div>
        <div className="mini-dashboard">
          <div className="mini-top"><div className="mini-logo"><span><Beer size={14} /></span> maltix<span className="brand-period">.</span></div><span className="mini-live"><i /> OPERAÇÃO ATIVA</span></div>
          <div className="mini-welcome"><span>VISÃO GERAL</span><strong>Bom dia, cervejeiro 👋</strong><small>Sua produção está no ritmo.</small></div>
          <div className="mini-metrics">
            <div><span><Factory size={14} /></span><small>TANQUES</small><strong>08 <i>/ 12</i></strong></div>
            <div><span><FlaskConical size={14} /></span><small>LOTES ATIVOS</small><strong>06</strong></div>
            <div><span><Gauge size={14} /></span><small>PRODUÇÃO</small><strong>4.280 <i>L</i></strong></div>
          </div>
          <div className="mini-production"><div className="mini-section-title"><strong>Produção da semana</strong><small>+12,8%</small></div><div className="mini-bars">{[38, 57, 45, 76, 54, 89, 66].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div><div className="mini-days"><span>SEG</span><span>TER</span><span>QUA</span><span>QUI</span><span>SEX</span><span>SÁB</span><span>DOM</span></div></div>
          <div className="mini-tank-note"><span className="mini-tank-icon"><Beer size={16} /></span><span><strong>IPA da Casa</strong><small>Fermentador F-03 · Dia 08</small></span><span className="mini-progress"><i /></span></div>
        </div>
        <div className="floating-note note-batches"><span><CircleCheck size={17} /></span><div><strong>Lote acompanhado</strong><small>Do tanque ao envase</small></div></div>
        <div className="floating-note note-orders"><span><Users size={17} /></span><div><strong>Pedidos em dia</strong><small>Clientes sempre por perto</small></div></div>
        <div className="visual-caption"><span /><span /> CONTROLE QUE ACOMPANHA SEU RITMO</div>
      </div>
    </section>

    <section className="trust-strip" aria-label="Benefícios">
      <span><Check size={15} /> Produção organizada</span><span><Check size={15} /> Decisões com clareza</span><span><Check size={15} /> Mais tempo para criar</span>
    </section>

    <section className="features-section" id="plataforma">
      <div className="section-intro"><span className="section-eyebrow">SUA OPERAÇÃO, EM HARMONIA</span><h2>Menos planilha.<br /><span>Mais cerveja boa.</span></h2><p>Uma visão completa da sua operação para você cuidar do que sabe fazer de melhor.</p></div>
      <div className="feature-grid" id="para-quem">
        <Feature icon={<Factory size={19} />} number="01" title="Tanques sob controle" description="Veja ocupação, etapas e medições de cada tanque sem perder o fio da produção." />
        <Feature icon={<FlaskConical size={19} />} number="02" title="Lotes com histórico" description="Acompanhe cada brassagem da fermentação ao envase com informação sempre à mão." />
        <Feature icon={<Users size={19} />} number="03" title="Clientes e pedidos" description="Organize parceiros, entregas e vendas em um fluxo simples para toda a equipe." />
      </div>
    </section>

    <section className="closing-cta">
      <div className="closing-icon"><Leaf size={23} /></div><div><span>PRONTO PARA O PRÓXIMO LOTE?</span><h2>Mais controle. Mais tempo para criar.</h2></div>
      <button className="public-button public-button-amber" onClick={onSignUp}>Criar minha conta <ArrowRight size={16} /></button>
    </section>
    <p className="landing-demo-footnote"><ShieldCheck size={14} /> A autenticação usa Firebase; os módulos Biesdorf acessam as coleções operacionais existentes.</p>
  </>;
}

function Feature({ icon, number, title, description }: { icon: ReactNode; number: string; title: string; description: string }) {
  return <article className="feature-card"><div className="feature-card-top"><span>{icon}</span><small>{number}</small></div><h3>{title}</h3><p>{description}</p><span className="feature-arrow"><ArrowRight size={16} /></span></article>;
}

function AuthLayout({ title, subtitle, children, step = false }: { title: string; subtitle: string; children: ReactNode; step?: boolean }) {
  return <section className={`auth-layout ${step ? 'auth-layout-step' : ''}`}>
    <aside className="auth-aside">
      <div className="auth-aside-content"><span className="auth-eyebrow"><Sparkles size={14} /> GESTÃO FEITA PARA CERVEJEIROS</span><h2>Do primeiro malte<br />ao próximo brinde.</h2><p>Organize a produção, cuide dos pedidos e acompanhe cada etapa com tranquilidade.</p>
        <ul><li><span><Check size={14} /></span> Visão clara da sua produção</li><li><span><Check size={14} /></span> Lotes e tanques conectados</li><li><span><Check size={14} /></span> Clientes sempre por perto</li></ul>
      </div>
      <div className="auth-aside-note"><Beer size={17} /><span>Seu próximo lote merece uma boa gestão.</span></div>
      <div className="aside-decoration aside-decoration-one" /><div className="aside-decoration aside-decoration-two" />
    </aside>
    <div className="auth-panel">
      <div className="auth-panel-inner">
        {step && <div className="setup-progress"><span className="progress-done"><i>1</i> Conta</span><i className="progress-line" /><span className="progress-current"><i>2</i> Cervejaria</span></div>}
        <span className="auth-panel-kicker">{step ? 'CONFIGURAÇÃO DO ESPAÇO' : 'BEM-VINDO À MALTIX'}</span>
        <h1>{title}</h1><p className="auth-subtitle">{subtitle}</p>
        {children}
      </div>
    </div>
  </section>;
}

function Field({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return <label className="public-field"><span>{label}</span><span className={`public-input-wrap ${icon ? 'has-field-icon' : ''}`}>{icon}{children}</span></label>;
}

function DemoNotice({ mode }: { mode: 'signin' | 'signup' }) {
  return mode === 'signin'
    ? <p className="demo-notice"><ShieldCheck size={15} /><span><strong>Acesso operacional.</strong> Entre com uma conta Biesdorf já existente para consultar e atualizar os dados operacionais.</span></p>
    : <p className="demo-notice"><ShieldCheck size={15} /><span><strong>Demonstração local.</strong> Este cadastro não cria usuário no Firebase nem concede acesso às coleções Biesdorf.</span></p>;
}
