import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, Beer, Check, ChevronDown,
  ChevronRight, CircleHelp, ClipboardList, Clock3, Download, Droplets,
  Factory, Filter, FlaskConical, LayoutDashboard, Menu, MoreHorizontal,
  LogOut, Plus, Search, Settings2, SlidersHorizontal, Thermometer, Users, Wind, X,
  CalendarDays, ChartArea, Truck, Boxes, LockKeyhole,
} from 'lucide-react';
import { initialBatches, initialCustomers, initialMeasurements, initialOrders, initialTanks } from './data';
import type { Batch, Customer, Measurement, Order, OrderStatus, Tank, TankStatus } from './types';
import Onboarding, { type DemoUser } from './Onboarding';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './biesdorf/firebase';
import BiesdorfDashboard from './biesdorf/pages/Dashboard';
import BiesdorfOrders from './biesdorf/pages/Pedidos';
import BiesdorfReports from './biesdorf/pages/Relatorios';
import BiesdorfCustomers from './biesdorf/pages/Clientes';
import BiesdorfDeliveries from './biesdorf/pages/Entregas';
import BiesdorfEquipment from './biesdorf/pages/Equipamentos';
import BiesdorfEvents from './biesdorf/pages/Eventos';
import BiesdorfBeerStock from './biesdorf/pages/Cervejas';
import './onboarding.css';

type View =
  | 'Dashboard' | 'Tanques' | 'Lotes' | 'Pedidos' | 'Clientes'
  | 'Operação Biesdorf' | 'Pedidos Biesdorf' | 'Relatórios' | 'Entregas'
  | 'Equipamentos' | 'Clientes Biesdorf' | 'Eventos' | 'Estoque de cervejas';
type ModalKind = 'batch' | 'measurement' | 'customer' | 'order' | null;

const maltixNavigation = [
  ['Dashboard', LayoutDashboard],
  ['Tanques', Factory],
  ['Lotes', FlaskConical],
  ['Pedidos', ClipboardList],
  ['Clientes', Users],
] as const;
const biesdorfNavigation = [
  ['Operação Biesdorf', LayoutDashboard],
  ['Pedidos Biesdorf', ClipboardList],
  ['Relatórios', ChartArea],
  ['Entregas', Truck],
  ['Equipamentos', Factory],
  ['Clientes Biesdorf', Users],
  ['Eventos', CalendarDays],
  ['Estoque de cervejas', Boxes],
] as const;

const tankStatuses: TankStatus[] = ['Livre', 'Em Fermentação', 'Em Maturação', 'Pronto p/ Envase', 'Higienização/CIP'];
const orderStatuses: OrderStatus[] = ['Rascunho', 'Confirmado', 'Em Envase/Separação', 'Pronto p/ Envio', 'Entregue'];
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const dateLabel = (date: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(`${date}T12:00:00`));

function statusClass(status: string) {
  if (status === 'Livre' || status === 'Concluído' || status === 'Entregue') return 'status status-neutral';
  if (status === 'Em Fermentação' || status === 'Confirmado') return 'status status-blue';
  if (status === 'Em Maturação' || status === 'Em Produção') return 'status status-violet';
  if (status === 'Pronto p/ Envase' || status === 'Pronto p/ Envio') return 'status status-green';
  if (status.includes('CIP') || status === 'Rascunho') return 'status status-amber';
  return 'status status-sky';
}

function Badge({ children }: { children: ReactNode }) {
  return <span className={statusClass(String(children))}><span className="status-dot" />{children}</span>;
}

export default function MaltixApp() {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      return;
    }
    return onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email ?? '';
        const fallbackName = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
        setUser({
          name: firebaseUser.displayName || fallbackName || 'Cervejeiro',
          email,
          breweryName: 'Cervejaria Biesdorf',
          canAccessBiesdorf: true,
        });
      } else {
        setUser(null);
      }
      setAuthReady(true);
    });
  }, []);

  if (!authReady) return <div className="auth-loading" role="status" aria-label="Verificando sessão"><span /></div>;

  if (!user) return <Onboarding onEnterApp={setUser} />;
  async function leaveAccount() {
    if (!auth) {
      setUser(null);
      return;
    }
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Erro ao sair da conta:', error);
      window.alert('Não foi possível encerrar a sessão. Tente novamente.');
    }
  }
  return <App user={user} onSignOut={leaveAccount} />;
}

function App({ user, onSignOut }: { user: DemoUser; onSignOut: () => void }) {
  const [view, setView] = useState<View>(user.canAccessBiesdorf ? 'Operação Biesdorf' : 'Dashboard');
  const [tanks, setTanks] = useState(initialTanks);
  const [batches, setBatches] = useState(initialBatches);
  const [measurements, setMeasurements] = useState(initialMeasurements);
  const [customers, setCustomers] = useState(initialCustomers);
  const [orders, setOrders] = useState(initialOrders);
  const [modal, setModal] = useState<ModalKind>(null);
  const [selectedTank, setSelectedTank] = useState<string>();
  const [selectedBatch, setSelectedBatch] = useState<Batch>();
  const [search, setSearch] = useState('');
  const [tankFilter, setTankFilter] = useState('Todos');
  const [statusMessage, setStatusMessage] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);

  const activeBatches = batches.filter((batch) => batch.status === 'Em Produção');
  const activeOrders = orders.filter((order) => order.status !== 'Entregue');
  const latestMeasurements = useMemo(() => {
    const map = new Map<string, Measurement>();
    measurements.forEach((measurement) => {
      const current = map.get(measurement.loteId);
      if (!current || measurement.dataHora > current.dataHora) map.set(measurement.loteId, measurement);
    });
    return map;
  }, [measurements]);
  const visibleTanks = tanks.filter((tank) => {
    const batch = batches.find((item) => item.id === tank.loteAtualId);
    const matchesSearch = `${tank.nome} ${tank.tipo} ${batch?.codigo ?? ''} ${batch?.estilo ?? ''}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (tankFilter === 'Todos' || tank.status === tankFilter);
  });

  function notify(message: string) {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(''), 3000);
  }

  function openModal(kind: ModalKind, tankId?: string) {
    setSelectedTank(tankId);
    setModal(kind);
  }

  function saveMeasurement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const tank = tanks.find((item) => item.id === selectedTank);
    if (!tank?.loteAtualId) return;
    const measurement: Measurement = {
      id: crypto.randomUUID(), loteId: tank.loteAtualId, dataHora: new Date().toISOString(),
      temperatura: Number(form.get('temperatura')), densidade: Number(form.get('densidade')),
      pressao: Number(form.get('pressao')), ph: Number(form.get('ph')),
      observacao: String(form.get('observacao') ?? ''),
    };
    setMeasurements((current) => [measurement, ...current]);
    setModal(null);
    notify(`Medição registrada para ${tank.nome}.`);
  }

  function changeTankStatus(tankId: string, status: TankStatus) {
    setTanks((current) => current.map((tank) => tank.id === tankId ? { ...tank, status, ...(status === 'Livre' ? { loteAtualId: undefined } : {}) } : tank));
    if (status === 'Livre') {
      const batch = batches.find((item) => item.tanqueId === tankId && item.status === 'Em Produção');
      if (batch) setBatches((current) => current.map((item) => item.id === batch.id ? { ...item, status: 'Concluído' } : item));
    }
    notify(`Status do tanque atualizado para ${status}.`);
  }

  function saveBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const tankId = String(form.get('tanqueId'));
    const tank = tanks.find((item) => item.id === tankId);
    if (!tank || tank.status !== 'Livre') {
      notify('Selecione um tanque livre para iniciar o lote.');
      return;
    }
    const batch: Batch = {
      id: crypto.randomUUID(), codigo: String(form.get('codigo')), estilo: String(form.get('estilo')),
      dataBrassagem: String(form.get('dataBrassagem')), volumeLitros: Number(form.get('volumeLitros')),
      tanqueId, status: 'Em Produção', diaAtual: 1, diasPlanejados: Number(form.get('diasPlanejados')),
    };
    setBatches((current) => [batch, ...current]);
    setTanks((current) => current.map((item) => item.id === tankId ? { ...item, status: 'Em Fermentação', loteAtualId: batch.id } : item));
    setModal(null);
    notify(`Lote ${batch.codigo} iniciado em ${tank.nome}.`);
  }

  function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setCustomers((current) => [{
      id: crypto.randomUUID(), nomeEmpresa: String(form.get('nomeEmpresa')), contato: String(form.get('contato')),
      cidade: String(form.get('cidade')), documento: String(form.get('documento')),
    }, ...current]);
    setModal(null);
    notify('Cliente cadastrado com sucesso.');
  }

  function saveOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const quantidade = Number(form.get('quantidade'));
    const valorUnitario = Number(form.get('valorUnitario'));
    const order: Order = {
      id: `PED-${Math.floor(2500 + Math.random() * 500)}`, clienteId: String(form.get('clienteId')),
      dataPedido: new Date().toISOString().slice(0, 10), dataEntrega: String(form.get('dataEntrega')),
      status: 'Rascunho', itens: [{ estilo: String(form.get('estilo')), formato: String(form.get('formato')), quantidade, valorUnitario }],
      valorTotal: quantidade * valorUnitario,
    };
    setOrders((current) => [order, ...current]);
    setModal(null);
    notify('Pedido adicionado como rascunho.');
  }

  function setOrderStatus(orderId: string, status: OrderStatus) {
    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status } : order));
    notify(`Pedido ${orderId} atualizado.`);
  }

  function finishBatch(batch: Batch) {
    setBatches((current) => current.map((item) => item.id === batch.id ? { ...item, status: 'Concluído' } : item));
    setTanks((current) => current.map((tank) => tank.id === batch.tanqueId ? { ...tank, status: 'Livre', loteAtualId: undefined } : tank));
    setSelectedBatch(undefined);
    notify(`Lote ${batch.codigo} finalizado e tanque liberado.`);
  }

  function navigate(next: View) {
    setView(next);
    setMobileMenu(false);
    setSearch('');
  }

  return (
    <div className="app-shell">
      {mobileMenu && <button className="mobile-scrim" aria-label="Fechar navegação" onClick={() => setMobileMenu(false)} />}
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <a className="brand" href="/maltix/" onClick={(event) => { event.preventDefault(); navigate('Dashboard'); }}>
          <span className="brand-mark"><Beer size={23} strokeWidth={2.2} /></span><span className="brand-word">maltix<span>.</span></span>
        </a>
        <div className="workspace-switch">
          <span className="brewery-avatar">B</span>
          <span className="workspace-copy"><strong>{user.breweryName}</strong><small>{user.canAccessBiesdorf ? 'Acesso Biesdorf' : 'Demonstração Maltix'}</small></span>
          <ChevronDown size={15} />
        </div>
        <nav className="side-nav">
          <span className="nav-label">MALTIX · DEMONSTRAÇÃO</span>
          {maltixNavigation.map(([label, Icon]) => (
            <button key={label} aria-label={label} className={`nav-item ${view === label ? 'nav-active' : ''}`} onClick={() => navigate(label)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {label === 'Pedidos' && <span className="nav-count">{activeOrders.length}</span>}
            </button>
          ))}
          <span className="nav-label">BIESDORF · OPERAÇÃO</span>
          {biesdorfNavigation.map(([label, Icon]) => (
            <button key={label} aria-label={label} className={`nav-item ${view === label ? 'nav-active' : ''}`} onClick={() => navigate(label)} disabled={!user.canAccessBiesdorf} title={!user.canAccessBiesdorf ? 'Entre com uma conta Biesdorf existente para acessar' : undefined}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {!user.canAccessBiesdorf && <LockKeyhole size={13} className="nav-lock" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><span className="help-icon"><CircleHelp size={17} /></span><div><strong>Precisa de ajuda?</strong><small>Fale com nosso time</small></div><ArrowRight size={15} /></div>
          <button className="nav-item"><Settings2 size={18} /><span>Configurações</span></button>
          <div className="profile">
            <div className="profile-avatar">{user.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div><div className="profile-copy"><strong>{user.name}</strong><small>Administrador</small></div><MoreHorizontal size={18} />
          </div>
          <button className="nav-item" onClick={onSignOut}><LogOut size={18} /><span>Sair da conta</span></button>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <button className="mobile-menu-button icon-button" aria-label="Abrir menu" onClick={() => setMobileMenu(true)}><Menu size={21} /></button>
          <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>{view}</strong></div>
          <div className="topbar-actions">
            <label className="global-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar tanques, lotes..." /><kbd>⌘ K</kbd></label>
            <button className="icon-button notification-button" aria-label="Notificações"><Bell size={18} /><i /></button>
            <div className="top-avatar" aria-label={user.name}>{user.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
          </div>
        </header>

        <div className="page-content">
          {view === 'Dashboard' && <Dashboard
            user={user} tanks={tanks} batches={batches} orders={orders} customers={customers} measurements={latestMeasurements}
            onNavigate={navigate} onAddBatch={() => openModal('batch')} onRecord={(id) => openModal('measurement', id)}
            onChangeStatus={changeTankStatus} onBatchDetails={setSelectedBatch} onOrderStatus={setOrderStatus}
          />}
          {view === 'Tanques' && <TankPage tanks={visibleTanks} batches={batches} measurements={latestMeasurements}
            filter={tankFilter} setFilter={setTankFilter} onAddBatch={() => openModal('batch')} onRecord={(id) => openModal('measurement', id)}
            onChangeStatus={changeTankStatus} onBatchDetails={setSelectedBatch} />}
          {view === 'Lotes' && <BatchPage batches={batches.filter((batch) => `${batch.codigo} ${batch.estilo}`.toLowerCase().includes(search.toLowerCase()))}
            tanks={tanks} onAdd={() => openModal('batch')} onDetails={setSelectedBatch} />}
          {view === 'Pedidos' && <OrdersPage orders={orders.filter((order) => `${order.id} ${customers.find((c) => c.id === order.clienteId)?.nomeEmpresa ?? ''}`.toLowerCase().includes(search.toLowerCase()))}
            customers={customers} onAdd={() => openModal('order')} onStatus={setOrderStatus} />}
          {view === 'Clientes' && <CustomersPage customers={customers.filter((customer) => `${customer.nomeEmpresa} ${customer.cidade} ${customer.documento}`.toLowerCase().includes(search.toLowerCase()))}
            orders={orders} onAdd={() => openModal('customer')} />}
          {user.canAccessBiesdorf && view === 'Operação Biesdorf' && <BiesdorfDashboard />}
          {user.canAccessBiesdorf && view === 'Pedidos Biesdorf' && <BiesdorfOrders />}
          {user.canAccessBiesdorf && view === 'Relatórios' && <BiesdorfReports />}
          {user.canAccessBiesdorf && view === 'Entregas' && <BiesdorfDeliveries />}
          {user.canAccessBiesdorf && view === 'Equipamentos' && <BiesdorfEquipment />}
          {user.canAccessBiesdorf && view === 'Clientes Biesdorf' && <BiesdorfCustomers />}
          {user.canAccessBiesdorf && view === 'Eventos' && <BiesdorfEvents />}
          {user.canAccessBiesdorf && view === 'Estoque de cervejas' && <BiesdorfBeerStock />}
        </div>
      </main>

      {statusMessage && <div className="toast"><span><Check size={16} /></span>{statusMessage}</div>}
      {modal && <Modal title={{ batch: 'Iniciar novo lote', measurement: 'Registrar medição', customer: 'Adicionar cliente', order: 'Criar pedido' }[modal]} onClose={() => setModal(null)}>
        {modal === 'batch' && <form onSubmit={saveBatch}>
          <div className="form-grid">
            <Field label="Código do lote"><input name="codigo" placeholder="Ex.: L2026-086" required /></Field>
            <Field label="Estilo da cerveja"><input name="estilo" placeholder="Ex.: Session IPA" required /></Field>
            <Field label="Volume planejado (L)"><input name="volumeLitros" type="number" min="1" placeholder="1.000" required /></Field>
            <Field label="Data da brassagem"><input name="dataBrassagem" type="date" required /></Field>
            <Field label="Tanque destino"><select name="tanqueId" required defaultValue=""><option value="" disabled>Selecione um tanque livre</option>{tanks.filter((tank) => tank.status === 'Livre').map((tank) => <option value={tank.id} key={tank.id}>{tank.nome} · {tank.capacidadeLitros.toLocaleString('pt-BR')} L</option>)}</select></Field>
            <Field label="Duração prevista (dias)"><input name="diasPlanejados" type="number" min="1" defaultValue="14" required /></Field>
          </div>
          <ModalActions onCancel={() => setModal(null)} label="Iniciar lote" />
        </form>}
        {modal === 'measurement' && <form onSubmit={saveMeasurement}>
          <div className="form-grid">
            <Field label="Temperatura (°C)"><input name="temperatura" type="number" step="0.1" placeholder="18,5" required /></Field>
            <Field label="Densidade (SG)"><input name="densidade" type="number" step="0.001" placeholder="1.018" required /></Field>
            <Field label="Pressão (bar)"><input name="pressao" type="number" step="0.1" placeholder="0,8" required /></Field>
            <Field label="pH"><input name="ph" type="number" step="0.1" min="0" max="14" placeholder="4,4" required /></Field>
          </div>
          <Field label="Observações"><textarea name="observacao" rows={3} placeholder="Notas sobre a fermentação..." /></Field>
          <ModalActions onCancel={() => setModal(null)} label="Salvar medição" />
        </form>}
        {modal === 'customer' && <form onSubmit={saveCustomer}>
          <div className="form-grid">
            <Field label="Nome da empresa"><input name="nomeEmpresa" placeholder="Ex.: Bar do Malte" required /></Field>
            <Field label="CNPJ / CPF"><input name="documento" placeholder="00.000.000/0000-00" required /></Field>
            <Field label="Telefone de contato"><input name="contato" placeholder="(11) 99999-9999" required /></Field>
            <Field label="Cidade"><input name="cidade" placeholder="São Paulo, SP" required /></Field>
          </div>
          <ModalActions onCancel={() => setModal(null)} label="Cadastrar cliente" />
        </form>}
        {modal === 'order' && <form onSubmit={saveOrder}>
          <div className="form-grid">
            <Field label="Cliente"><select name="clienteId" required defaultValue=""><option value="" disabled>Selecione um cliente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.nomeEmpresa}</option>)}</select></Field>
            <Field label="Data de entrega"><input name="dataEntrega" type="date" required /></Field>
            <Field label="Estilo"><input name="estilo" placeholder="Ex.: West Coast IPA" required /></Field>
            <Field label="Formato"><select name="formato"><option>Barril 30L</option><option>Barril 50L</option><option>Caixa de lata</option><option>Caixa de garrafa</option></select></Field>
            <Field label="Quantidade"><input name="quantidade" type="number" min="1" defaultValue="1" required /></Field>
            <Field label="Valor unitário (R$)"><input name="valorUnitario" type="number" min="0" step="0.01" placeholder="540,00" required /></Field>
          </div>
          <ModalActions onCancel={() => setModal(null)} label="Criar pedido" />
        </form>}
      </Modal>}
      {selectedBatch && <BatchDetail batch={selectedBatch} tank={tanks.find((tank) => tank.id === selectedBatch.tanqueId)}
        measurements={measurements.filter((measurement) => measurement.loteId === selectedBatch.id)}
        onClose={() => setSelectedBatch(undefined)} onRecord={() => { setSelectedBatch(undefined); openModal('measurement', selectedBatch.tanqueId); }}
        onFinish={() => finishBatch(selectedBatch)} />}
    </div>
  );
}

function Dashboard({ user, tanks, batches, orders, customers, measurements, onNavigate, onAddBatch, onRecord, onChangeStatus, onBatchDetails, onOrderStatus }: {
  user: DemoUser;
  tanks: Tank[]; batches: Batch[]; orders: Order[]; customers: Customer[]; measurements: Map<string, Measurement>;
  onNavigate: (view: View) => void; onAddBatch: () => void; onRecord: (id: string) => void;
  onChangeStatus: (id: string, status: TankStatus) => void; onBatchDetails: (batch: Batch) => void; onOrderStatus: (id: string, status: OrderStatus) => void;
}) {
  const occupied = tanks.filter((tank) => tank.status !== 'Livre').length;
  const production = batches.filter((batch) => batch.status === 'Em Produção').length;
  const revenue = orders.filter((order) => order.status !== 'Rascunho').reduce((sum, order) => sum + order.valorTotal, 0);
  return <>
    <PageHeading eyebrow={new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date()).toUpperCase()} title={`Bom dia, ${user.name.split(/\s+/)[0]} 👋`} subtitle="Aqui está o resumo da sua operação hoje."
      action={<button className="button button-primary" onClick={onAddBatch}><Plus size={17} /> Novo lote</button>} />
    <div className="metrics-grid">
      <Metric icon={<Factory size={18} />} label="Tanques ocupados" value={`${occupied} / ${tanks.length}`} trend="2 disponíveis" tone="amber" />
      <Metric icon={<FlaskConical size={18} />} label="Lotes em produção" value={String(production).padStart(2, '0')} trend="+1 esta semana" tone="violet" />
      <Metric icon={<ClipboardList size={18} />} label="Pedidos em aberto" value={String(orders.filter((order) => order.status !== 'Entregue').length).padStart(2, '0')} trend="3 entregas próximas" tone="blue" />
      <Metric icon={<Activity size={18} />} label="Vendas confirmadas" value={money(revenue)} trend="+12,8% este mês" tone="green" />
    </div>
    <div className="dashboard-grid">
      <section className="panel tank-panel">
        <div className="panel-heading"><div><h2>Mapa de tanques</h2><p>Acompanhe sua produção em tempo real</p></div><button className="button button-quiet" onClick={() => onNavigate('Tanques')}>Ver todos <ArrowRight size={15} /></button></div>
        <div className="tank-grid">{tanks.slice(0, 4).map((tank) => <TankCard key={tank.id} tank={tank} batch={batches.find((item) => item.id === tank.loteAtualId)}
          measurement={tank.loteAtualId ? measurements.get(tank.loteAtualId) : undefined} onRecord={() => onRecord(tank.id)} onStatus={onChangeStatus} onBatchDetails={onBatchDetails} compact />)}</div>
        <button className="view-more" onClick={() => onNavigate('Tanques')}>Ver mapa completo dos tanques <ArrowRight size={15} /></button>
      </section>
      <section className="panel production-panel">
        <div className="panel-heading"><div><h2>Ritmo de produção</h2><p>Volume produzido nos últimos 7 dias</p></div><button className="select-pill">Esta semana <ChevronDown size={14} /></button></div>
        <div className="chart-summary"><strong>4.280 <small>L</small></strong><span><ArrowUpRight size={14} /> 8,4%</span></div>
        <ProductionChart />
      </section>
    </div>
    <div className="bottom-grid">
      <section className="panel orders-panel">
        <div className="panel-heading"><div><h2>Pedidos recentes</h2><p>Últimas movimentações de venda</p></div><button className="button button-quiet" onClick={() => onNavigate('Pedidos')}>Ver pedidos <ArrowRight size={15} /></button></div>
        <OrderTable orders={orders.slice(0, 4)} customers={customers} onStatus={onOrderStatus} compact />
      </section>
      <section className="panel batch-panel">
        <div className="panel-heading"><div><h2>Lotes ativos</h2><p>Em produção agora</p></div><button className="icon-button subtle-icon" aria-label="Opções"><MoreHorizontal size={19} /></button></div>
        <div className="active-batch-list">{batches.filter((batch) => batch.status === 'Em Produção').slice(0, 4).map((batch, index) => <button key={batch.id} className="active-batch" onClick={() => onBatchDetails(batch)}>
          <span className={`batch-symbol batch-symbol-${index % 3}`}><Beer size={17} /></span><span className="active-batch-copy"><strong>{batch.estilo}</strong><small>{batch.codigo} · {tanks.find((tank) => tank.id === batch.tanqueId)?.nome}</small></span><span className="batch-progress"><strong>Dia {batch.diaAtual}</strong><small>de {batch.diasPlanejados}</small></span>
        </button>)}</div>
        <button className="view-more" onClick={() => onNavigate('Lotes')}>Acessar todos os lotes <ArrowRight size={15} /></button>
      </section>
    </div>
  </>;
}

function TankPage({ tanks, batches, measurements, filter, setFilter, onAddBatch, onRecord, onChangeStatus, onBatchDetails }: {
  tanks: Tank[]; batches: Batch[]; measurements: Map<string, Measurement>; filter: string; setFilter: (filter: string) => void;
  onAddBatch: () => void; onRecord: (id: string) => void; onChangeStatus: (id: string, status: TankStatus) => void; onBatchDetails: (batch: Batch) => void;
}) {
  return <>
    <PageHeading eyebrow="CHÃO DE FÁBRICA" title="Mapa de tanques" subtitle="Visão geral dos equipamentos e da produção da cervejaria."
      action={<button className="button button-primary" onClick={onAddBatch}><Plus size={17} /> Iniciar lote</button>} />
    <div className="inline-stats"><span><i className="legend-dot dot-green" /> Livres <strong>{tanks.filter((tank) => tank.status === 'Livre').length}</strong></span><span><i className="legend-dot dot-blue" /> Em produção <strong>{tanks.filter((tank) => tank.status === 'Em Fermentação' || tank.status === 'Em Maturação').length}</strong></span><span><i className="legend-dot dot-amber" /> Higienização <strong>{tanks.filter((tank) => tank.status.includes('CIP')).length}</strong></span></div>
    <div className="filter-row"><div className="filter-pills">{['Todos', ...tankStatuses].map((status) => <button key={status} className={`filter-pill ${filter === status ? 'filter-selected' : ''}`} onClick={() => setFilter(status)}>{status}</button>)}</div><button className="button button-outline filter-button"><SlidersHorizontal size={15} /> Filtros</button></div>
    {tanks.length ? <div className="tank-grid tank-grid-full">{tanks.map((tank) => <TankCard key={tank.id} tank={tank} batch={batches.find((item) => item.id === tank.loteAtualId)}
      measurement={tank.loteAtualId ? measurements.get(tank.loteAtualId) : undefined} onRecord={() => onRecord(tank.id)} onStatus={onChangeStatus} onBatchDetails={onBatchDetails} />)}</div>
      : <EmptyState title="Nenhum tanque encontrado" subtitle="Tente alterar a busca ou o filtro selecionado." />}
  </>;
}

function TankCard({ tank, batch, measurement, onRecord, onStatus, onBatchDetails, compact = false }: {
  tank: Tank; batch?: Batch; measurement?: Measurement; onRecord: () => void; onStatus: (id: string, status: TankStatus) => void;
  onBatchDetails: (batch: Batch) => void; compact?: boolean;
}) {
  const [showStatuses, setShowStatuses] = useState(false);
  const occupied = tank.status !== 'Livre' && tank.status !== 'Higienização/CIP';
  return <article className={`tank-card ${compact ? 'tank-card-compact' : ''}`}>
    <div className="tank-card-top"><div className="tank-name"><span className={`tank-type-icon ${tank.tipo === 'BBT' ? 'tank-type-bbt' : tank.tipo === 'Maturador' ? 'tank-type-maturador' : ''}`}><Factory size={17} /></span><div><strong>{tank.nome}</strong><small>{tank.tipo} · {tank.capacidadeLitros.toLocaleString('pt-BR')} L</small></div></div><button className="icon-button card-menu" aria-label={`Alterar status ${tank.nome}`} onClick={() => setShowStatuses((value) => !value)}><MoreHorizontal size={19} /></button>
      {showStatuses && <div className="status-menu">{tankStatuses.map((status) => <button key={status} onClick={() => { onStatus(tank.id, status); setShowStatuses(false); }}>{status}</button>)}</div>}
    </div>
    <div className="tank-status-row"><Badge>{tank.status}</Badge>{occupied && batch && <button className="batch-link" onClick={() => onBatchDetails(batch)}>{batch.codigo}<ArrowRight size={13} /></button>}</div>
    {occupied && batch ? <>
      <div className="tank-beer"><span className="beer-mark"><Beer size={16} /></span><div><strong>{batch.estilo}</strong><small>{batch.volumeLitros.toLocaleString('pt-BR')} L no tanque</small></div></div>
      <div className="tank-progress"><div className="progress-track"><span style={{ width: `${Math.min(100, Math.round((batch.diaAtual / batch.diasPlanejados) * 100))}%` }} /></div><span>Dia {batch.diaAtual}<i>/</i>{batch.diasPlanejados}</span></div>
      <div className="tank-readings"><span><Thermometer size={14} /> {measurement ? `${measurement.temperatura.toFixed(1)}°C` : '—'}</span><span><Droplets size={14} /> {measurement ? measurement.densidade.toFixed(3) : '—'} SG</span><span><Wind size={14} /> {measurement ? `${measurement.pressao.toFixed(1)} bar` : '—'}</span></div>
    </> : <div className="tank-empty-state">{tank.status === 'Livre' ? <><span className="empty-tank-icon"><Check size={18} /></span><strong>Pronto para receber lote</strong><small>Capacidade disponível para produção</small></> : <><span className="empty-tank-icon cleaning"><Droplets size={17} /></span><strong>Ciclo de limpeza ativo</strong><small>Tanque em higienização</small></>}</div>}
    <div className="tank-card-actions">{occupied && batch ? <><button className="button button-outline" onClick={onRecord}><Plus size={14} /> Registrar medição</button><button className="button button-text" onClick={() => onStatus(tank.id, 'Livre')}>Finalizar lote</button></> : <button className="button button-outline button-full" disabled={tank.status === 'Livre'} onClick={() => onStatus(tank.id, 'Livre')}><Check size={14} /> {tank.status === 'Livre' ? 'Tanque disponível' : 'Concluir higienização'}</button>}</div>
  </article>;
}

function BatchPage({ batches, tanks, onAdd, onDetails }: { batches: Batch[]; tanks: Tank[]; onAdd: () => void; onDetails: (batch: Batch) => void }) {
  const [tab, setTab] = useState('Ativos');
  const filtered = batches.filter((batch) => tab === 'Todos' || (tab === 'Ativos' ? batch.status === 'Em Produção' : batch.status !== 'Em Produção'));
  return <>
    <PageHeading eyebrow="PRODUÇÃO" title="Lotes" subtitle="Acompanhe o ciclo de vida de cada brassagem, da fervura ao envase." action={<button className="button button-primary" onClick={onAdd}><Plus size={17} /> Novo lote</button>} />
    <div className="list-toolbar"><div className="tab-switch">{['Ativos', 'Histórico', 'Todos'].map((item) => <button key={item} className={tab === item ? 'tab-active' : ''} onClick={() => setTab(item)}>{item}</button>)}</div><button className="button button-outline"><Download size={15} /> Exportar</button></div>
    <section className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>CÓDIGO DO LOTE</th><th>ESTILO</th><th>TANQUE</th><th>VOLUME</th><th>BRASSAGEM</th><th>PROGRESSO</th><th>STATUS</th><th /></tr></thead><tbody>{filtered.map((batch) => <tr key={batch.id} onClick={() => onDetails(batch)} className="clickable-row">
      <td><button className="table-primary batch-code" onClick={(event) => { event.stopPropagation(); onDetails(batch); }}>{batch.codigo}</button></td><td><span className="table-main">{batch.estilo}</span></td><td><span className="tank-mini">{tanks.find((tank) => tank.id === batch.tanqueId)?.nome ?? '—'}</span></td><td>{batch.volumeLitros.toLocaleString('pt-BR')} L</td><td>{dateLabel(batch.dataBrassagem)}</td><td><div className="table-progress"><span className="progress-track"><i style={{ width: `${Math.min(100, batch.diaAtual / batch.diasPlanejados * 100)}%` }} /></span><small>{batch.status === 'Em Produção' ? `${batch.diaAtual}/${batch.diasPlanejados} dias` : 'Concluído'}</small></div></td><td><Badge>{batch.status}</Badge></td><td><ChevronRight size={16} className="row-chevron" /></td>
    </tr>)}</tbody></table>{!filtered.length && <EmptyState title="Nenhum lote nesta lista" subtitle="Inicie um novo lote para acompanhar sua produção." />}</div></section>
    <p className="table-footnote">Exibindo {filtered.length} de {batches.length} lotes</p>
  </>;
}

function OrdersPage({ orders, customers, onAdd, onStatus }: { orders: Order[]; customers: Customer[]; onAdd: () => void; onStatus: (id: string, status: OrderStatus) => void }) {
  return <>
    <PageHeading eyebrow="COMERCIAL" title="Pedidos" subtitle="Gerencie pedidos, prazos de entrega e faturamento." action={<button className="button button-primary" onClick={onAdd}><Plus size={17} /> Novo pedido</button>} />
    <div className="metrics-grid mini-metrics"><Metric icon={<ClipboardList size={18} />} label="Pedidos em aberto" value={String(orders.filter((item) => item.status !== 'Entregue').length).padStart(2, '0')} tone="amber" /><Metric icon={<Clock3 size={18} />} label="Aguardando envio" value={String(orders.filter((item) => item.status === 'Pronto p/ Envio').length).padStart(2, '0')} tone="blue" /><Metric icon={<Activity size={18} />} label="Valor em pedidos" value={money(orders.reduce((sum, item) => sum + (item.status === 'Entregue' ? 0 : item.valorTotal), 0))} tone="green" /><Metric icon={<Check size={18} />} label="Entregues no mês" value={String(orders.filter((item) => item.status === 'Entregue').length).padStart(2, '0')} tone="violet" /></div>
    <section className="panel table-panel orders-full-panel"><div className="panel-heading table-heading"><div><h2>Todos os pedidos</h2><p>{orders.length} pedidos no total</p></div><button className="button button-outline"><Filter size={15} /> Filtrar</button></div><OrderTable orders={orders} customers={customers} onStatus={onStatus} /></section>
  </>;
}

function OrderTable({ orders, customers, onStatus, compact = false }: { orders: Order[]; customers: Customer[]; onStatus: (id: string, status: OrderStatus) => void; compact?: boolean }) {
  return <div className="table-wrap"><table className="orders-table"><thead><tr><th>PEDIDO</th><th>CLIENTE</th><th>ITENS</th><th>ENTREGA</th><th>VALOR</th><th>STATUS</th>{!compact && <th>AÇÃO</th>}</tr></thead><tbody>{orders.map((order) => {
    const customer = customers.find((item) => item.id === order.clienteId);
    return <tr key={order.id}><td><span className="table-primary">{order.id}</span><small className="table-sub">{dateLabel(order.dataPedido)}</small></td><td><span className="table-main">{customer?.nomeEmpresa ?? 'Cliente removido'}</span><small className="table-sub">{customer?.cidade ?? ''}</small></td><td><span className="table-main">{order.itens[0]?.estilo}</span><small className="table-sub">{order.itens[0]?.quantidade} × {order.itens[0]?.formato}</small></td><td>{dateLabel(order.dataEntrega)}</td><td className="table-primary">{money(order.valorTotal)}</td><td><Badge>{order.status}</Badge></td>{!compact && <td><select aria-label={`Status ${order.id}`} className="status-select" value={order.status} onChange={(event) => onStatus(order.id, event.target.value as OrderStatus)}>{orderStatuses.map((status) => <option key={status}>{status}</option>)}</select></td>}</tr>;
  })}</tbody></table>{!orders.length && <EmptyState title="Nenhum pedido encontrado" subtitle="Crie um pedido para começar a acompanhar as vendas." />}</div>;
}

function CustomersPage({ customers, orders, onAdd }: { customers: Customer[]; orders: Order[]; onAdd: () => void }) {
  return <>
    <PageHeading eyebrow="RELACIONAMENTO" title="Clientes" subtitle="Sua carteira de parceiros e clientes B2B em um só lugar." action={<button className="button button-primary" onClick={onAdd}><Plus size={17} /> Adicionar cliente</button>} />
    <div className="metrics-grid mini-metrics"><Metric icon={<Users size={18} />} label="Clientes ativos" value={String(customers.length).padStart(2, '0')} tone="amber" /><Metric icon={<ClipboardList size={18} />} label="Com pedidos abertos" value={String(new Set(orders.filter((order) => order.status !== 'Entregue').map((order) => order.clienteId)).size).padStart(2, '0')} tone="blue" /><Metric icon={<Activity size={18} />} label="Cidades atendidas" value={String(new Set(customers.map((item) => item.cidade)).size).padStart(2, '0')} tone="green" /><Metric icon={<Beer size={18} />} label="Pedidos entregues" value={String(orders.filter((item) => item.status === 'Entregue').length).padStart(2, '0')} tone="violet" /></div>
    <section className="panel table-panel"><div className="panel-heading table-heading"><div><h2>Todos os clientes</h2><p>Seus parceiros comerciais</p></div><button className="button button-outline"><Filter size={15} /> Filtrar</button></div><div className="table-wrap"><table><thead><tr><th>EMPRESA</th><th>DOCUMENTO</th><th>CONTATO</th><th>CIDADE</th><th>PEDIDOS</th><th>FATURAMENTO</th></tr></thead><tbody>{customers.map((customer, index) => {
      const customerOrders = orders.filter((order) => order.clienteId === customer.id);
      const total = customerOrders.reduce((sum, order) => sum + order.valorTotal, 0);
      return <tr key={customer.id}><td><span className="customer-cell"><span className={`customer-avatar customer-avatar-${index % 4}`}>{customer.nomeEmpresa.slice(0, 1)}</span><span className="table-main">{customer.nomeEmpresa}</span></span></td><td>{customer.documento}</td><td>{customer.contato}</td><td>{customer.cidade}</td><td>{customerOrders.length} pedidos</td><td className="table-primary">{money(total)}</td></tr>;
    })}</tbody></table>{!customers.length && <EmptyState title="Nenhum cliente encontrado" subtitle="Adicione clientes para organizar sua carteira B2B." />}</div></section>
  </>;
}

function BatchDetail({ batch, tank, measurements, onClose, onRecord, onFinish }: { batch: Batch; tank?: Tank; measurements: Measurement[]; onClose: () => void; onRecord: () => void; onFinish: () => void }) {
  const sorted = [...measurements].sort((a, b) => a.dataHora.localeCompare(b.dataHora));
  const temps = sorted.map((item) => item.temperatura);
  const densities = sorted.map((item) => item.densidade);
  const toPoints = (values: number[]) => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    return values.map((value, index) => `${sorted.length < 2 ? 50 : 22 + (index / (sorted.length - 1)) * 88},${108 - ((value - min) / (max - min || 1)) * 78}`).join(' ');
  };
  const temperaturePoints = toPoints(temps);
  const densityPoints = toPoints(densities);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal batch-detail-modal">
    <div className="modal-header"><div><span className="eyebrow">DETALHES DO LOTE</span><h2>{batch.estilo}</h2><p>{batch.codigo} <span>·</span> {tank?.nome} <span>·</span> {batch.volumeLitros.toLocaleString('pt-BR')} L</p></div><button className="icon-button" aria-label="Fechar" onClick={onClose}><X size={20} /></button></div>
    <div className="detail-summary"><div><small>DATA DA BRASSAGEM</small><strong>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(`${batch.dataBrassagem}T12:00:00`))}</strong></div><div><small>PROGRESSO</small><strong>Dia {batch.diaAtual} de {batch.diasPlanejados}</strong></div><div><small>STATUS</small><Badge>{batch.status}</Badge></div></div>
    <div className="detail-chart-heading"><div><h3>Evolução do lote</h3><p>Variação das leituras registradas ao longo do processo</p></div><div className="chart-legends"><span className="chart-legend"><i /> Temperatura</span><span className="chart-legend density-legend"><i /> Densidade</span></div></div>
    <div className="detail-chart"><div className="chart-y-labels"><span>↑</span><span /><span /><span>↓</span></div><svg viewBox="0 0 132 120" preserveAspectRatio="none" role="img" aria-label="Gráfico de evolução da temperatura e densidade"><defs><linearGradient id="temperature-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#d99524" stopOpacity=".14" /><stop offset="100%" stopColor="#d99524" stopOpacity="0" /></linearGradient></defs>{[20, 48, 76, 104].map((y) => <line key={y} x1="0" x2="132" y1={y} y2={y} stroke="#e9edf2" strokeDasharray="2 3" />)}{sorted.length > 1 && <><polygon points={`22,110 ${temperaturePoints} 110,110`} fill="url(#temperature-fill)" /><polyline points={temperaturePoints} fill="none" stroke="#cc8516" strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" /><polyline points={densityPoints} fill="none" stroke="#6683bd" strokeWidth="1.8" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" /></>}</svg></div>
    <div className="measurement-table"><div className="measurement-head"><span>DATA</span><span>TEMP.</span><span>DENSIDADE</span><span>PRESSÃO</span><span>pH</span></div>{measurements.map((item) => <div className="measurement-row" key={item.id}><span>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(item.dataHora))}</span><strong>{item.temperatura.toFixed(1)}°C</strong><strong>{item.densidade.toFixed(3)}</strong><span>{item.pressao.toFixed(1)} bar</span><span>{item.ph.toFixed(1)}</span></div>)}{!measurements.length && <p className="empty-measurements">Nenhuma medição registrada ainda.</p>}</div>
    <div className="modal-footer"><button className="button button-outline" onClick={onRecord}><Plus size={15} /> Registrar medição</button>{batch.status === 'Em Produção' && <button className="button button-primary" onClick={onFinish}><Check size={16} /> Finalizar lote</button>}</div>
  </section></div>;
}

function ProductionChart() {
  const bars = [{ day: 'Seg', value: 46 }, { day: 'Ter', value: 66 }, { day: 'Qua', value: 51 }, { day: 'Qui', value: 82 }, { day: 'Sex', value: 61 }, { day: 'Sáb', value: 91 }, { day: 'Dom', value: 73 }];
  return <div className="production-chart"><div className="chart-grid-lines"><i /><i /><i /><i /></div><div className="chart-bars">{bars.map((bar, index) => <div className="chart-bar-column" key={bar.day}><div className={`chart-bar ${index === 5 ? 'chart-bar-highlight' : ''}`} style={{ height: `${bar.value}%` }} /><span>{bar.day}</span></div>)}</div></div>;
}

function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action: ReactNode }) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>;
}

function Metric({ icon, label, value, trend, tone }: { icon: ReactNode; label: string; value: string; trend?: string; tone: string }) {
  return <article className="metric-card"><div className={`metric-icon metric-${tone}`}>{icon}</div><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong>{trend && <small className={`metric-trend ${trend.startsWith('+') ? 'trend-positive' : ''}`}>{trend.startsWith('+') ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{trend}</small>}<span className="metric-decoration" /></article>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="form-field"><span>{label}</span>{children}</label>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal"><div className="modal-header"><div><span className="eyebrow">MALTIX · OPERAÇÃO</span><h2>{title}</h2></div><button className="icon-button" aria-label="Fechar" onClick={onClose}><X size={20} /></button></div>{children}</section></div>;
}

function ModalActions({ onCancel, label }: { onCancel: () => void; label: string }) {
  return <div className="modal-footer"><button type="button" className="button button-outline" onClick={onCancel}>Cancelar</button><button className="button button-primary" type="submit"><Check size={16} /> {label}</button></div>;
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="empty-state"><span><Search size={20} /></span><strong>{title}</strong><p>{subtitle}</p></div>;
}
