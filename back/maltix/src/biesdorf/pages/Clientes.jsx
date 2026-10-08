import { useState, useEffect } from 'react';
import {
  Users, Search, Plus, MapPin, Phone, Trash2, Edit2, X,
  Building2, User
} from 'lucide-react';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import WhatsAppIcon from "../components/WhatsAppIcon";
import SuccessMessage from '../components/SuccessToast';
import ConfirmModal from '../components/ConfirmModal';

// ─── helpers ──────────────────────────────────────────────────────────────────

const formatTelefone = (value) => {
  let n = value.replace(/\D/g, '').slice(0, 11);
  if (n.length <= 10) return n.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  return n.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
};

const formatCPF = (v) => {
  v = v.replace(/\D/g, '').slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  return v;
};

const formatCNPJ = (v) => {
  v = v.replace(/\D/g, '').slice(0, 14);
  v = v.replace(/^(\d{2})(\d)/, '$1.$2');
  v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
  v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
  v = v.replace(/(\d{4})(\d)/, '$1-$2');
  return v;
};

const iniciais = (nome) => {
  if (!nome) return '?';
  const partes = nome.trim().split(' ');
  if (partes.length === 1) return partes[0][0].toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
};

const avatarColor = (nome) => {
  const cores = [
    'bg-amber-500', 'bg-blue-500', 'bg-emerald-500',
    'bg-violet-500', 'bg-rose-500', 'bg-cyan-500', 'bg-orange-500'
  ];
  if (!nome) return cores[0];
  return cores[nome.charCodeAt(0) % cores.length];
};

// ─── Modal de cadastro / edição ───────────────────────────────────────────────

function ClienteModal({ isOpen, onClose, onSalvo, clienteEditando }) {
  const [form, setForm] = useState({
    nome: '', tipo: 'PF', cpf: '', cnpj: '',
    inscricaoEstadual: '', responsavel: '', telefone: '', endereco: ''
  });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(clienteEditando || {
      nome: '', tipo: 'PF', cpf: '', cnpj: '',
      inscricaoEstadual: '', responsavel: '', telefone: '', endereco: ''
    });
  }, [isOpen, clienteEditando]);

  if (!isOpen) return null;

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSalvar = async () => {
    if (!form.nome.trim()) { alert('Nome obrigatório'); return; }
    setSalvando(true);
    try {
      if (clienteEditando) {
        await updateDoc(doc(db, 'clientes', clienteEditando.id), form);
      } else {
        await addDoc(collection(db, 'clientes'), form);
      }
      onSalvo(!!clienteEditando);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-black text-gray-800">
            {clienteEditando ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Tipo toggle */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            {[['PF', 'Pessoa Física', User], ['PJ', 'Pessoa Jurídica', Building2]].map(([val, label, Icon]) => (
              <button
                key={val}
                onClick={() => set('tipo', val)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  form.tipo === val ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Nome *</label>
            <input
              value={form.nome}
              onChange={e => set('nome', e.target.value)}
              placeholder="Nome completo ou razão social"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
              {form.tipo === 'PF' ? 'CPF' : 'CNPJ'} <span className="normal-case font-normal">(opcional)</span>
            </label>
            <input
              type="text" inputMode="numeric"
              value={form.tipo === 'PF' ? form.cpf : form.cnpj}
              onChange={e => form.tipo === 'PF'
                ? set('cpf', formatCPF(e.target.value))
                : set('cnpj', formatCNPJ(e.target.value))
              }
              placeholder={form.tipo === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {form.tipo === 'PJ' && (
            <>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Inscrição Estadual</label>
                <input
                  type="text" inputMode="numeric"
                  value={form.inscricaoEstadual}
                  onChange={e => set('inscricaoEstadual', e.target.value.replace(/\D/g, ''))}
                  placeholder="Opcional"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Responsável</label>
                <input
                  value={form.responsavel}
                  onChange={e => set('responsavel', e.target.value)}
                  placeholder="Nome do responsável"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Telefone</label>
            <input
              type="text" inputMode="numeric" maxLength={15}
              value={form.telefone}
              onChange={e => set('telefone', formatTelefone(e.target.value))}
              placeholder="(00) 00000-0000"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Endereço</label>
            <input
              value={form.endereco}
              onChange={e => set('endereco', e.target.value)}
              placeholder="Rua, Número, Cidade"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="flex-[2] py-3 rounded-xl bg-primary hover:bg-primary-hover text-secondary font-black text-sm active:scale-95 transition-all disabled:opacity-60"
          >
            {salvando ? 'Salvando...' : clienteEditando ? 'Salvar Alterações' : 'Cadastrar Cliente'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card de cliente ──────────────────────────────────────────────────────────

function ClienteCard({ c, onEditar, onExcluir }) {
  const cor = avatarColor(c.nome);

  const abrirWhatsApp = () => {
    if (!c.telefone) return;
    window.open(`https://wa.me/55${c.telefone.replace(/\D/g, '')}`, '_blank');
  };

  const abrirMaps = () => {
    if (!c.endereco) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.endereco)}`, '_blank');
  };

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 overflow-hidden flex flex-col">

      <div className="relative px-5 pt-5 pb-4 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl ${cor} flex items-center justify-center text-white font-black text-base shrink-0 shadow-sm`}>
          {iniciais(c.nome)}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-black text-gray-800 text-base leading-tight truncate">{c.nome}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              c.tipo === 'PJ' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {c.tipo === 'PJ' ? 'Empresa' : 'Pessoa Física'}
            </span>
            {c.tipo === 'PJ' && c.responsavel && (
              <span className="text-xs text-gray-400 truncate">{c.responsavel}</span>
            )}
          </div>
        </div>

        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => onEditar(c)}
            className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-amber-100 hover:text-amber-700 transition-colors"
            title="Editar"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => onExcluir(c)}
            className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors"
            title="Excluir"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="h-px bg-gray-100 mx-5" />

      <div className="px-5 py-3 space-y-2 flex-1">
        {(c.cpf || c.cnpj) && (
          <p className="text-xs text-gray-400">
            {c.tipo === 'PF' && c.cpf && <span>CPF: {c.cpf}</span>}
            {c.tipo === 'PJ' && c.cnpj && <span>CNPJ: {c.cnpj}</span>}
            {c.tipo === 'PJ' && c.inscricaoEstadual && <span className="ml-3">IE: {c.inscricaoEstadual}</span>}
          </p>
        )}

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-gray-600 flex items-center gap-1.5">
            <Phone size={13} className="text-gray-400 shrink-0" />
            {c.telefone || <span className="text-gray-300 italic">Sem telefone</span>}
          </p>
          {c.telefone && (
            <button
              onClick={abrirWhatsApp}
              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors shrink-0"
              title="WhatsApp"
            >
              <WhatsAppIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-gray-600 flex items-start gap-1.5 min-w-0">
            <MapPin size={13} className="text-gray-400 shrink-0 mt-0.5" />
            <span className="truncate">
              {c.endereco || <span className="text-gray-300 italic">Sem endereço</span>}
            </span>
          </p>
          {c.endereco && (
            <button
              onClick={abrirMaps}
              className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shrink-0"
              title="Abrir no Maps"
            >
              <MapPin size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const dispararToast = (msg) => {
    setSuccessMsg(msg);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2500);
  };

  // ── Confirm modal ──────────────────────────────────────────────────────────
  const [confirmState, setConfirmState] = useState({
    isOpen: false, cliente: null, loading: false
  });

  const pedirConfirmacao = (cliente) => {
    setConfirmState({ isOpen: true, cliente, loading: false });
  };

  const handleConfirmarExclusao = async () => {
    setConfirmState(s => ({ ...s, loading: true }));
    try {
      await deleteDoc(doc(db, 'clientes', confirmState.cliente.id));
      setClientes(prev => prev.filter(c => c.id !== confirmState.cliente.id));
      setConfirmState({ isOpen: false, cliente: null, loading: false });
      dispararToast('Cliente excluído com sucesso');
    } catch (err) {
      console.error(err);
      setConfirmState(s => ({ ...s, loading: false }));
    }
  };

  const fetchClientes = async () => {
    try {
      const snapshot = await getDocs(query(collection(db, 'clientes')));
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
      setClientes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClientes(); }, []);

  const abrirNovo = () => { setClienteEditando(null); setIsModalOpen(true); };
  const abrirEdicao = (c) => { setClienteEditando(c); setIsModalOpen(true); };

  // Callback do modal — recebe se foi edição ou cadastro
  const handleSalvo = (foiEdicao) => {
    fetchClientes();
    dispararToast(foiEdicao ? 'Cliente atualizado com sucesso' : 'Cliente cadastrado com sucesso');
  };

  const clientesFiltrados = clientes.filter(c => {
    const matchBusca =
      c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      c.telefone?.includes(busca) ||
      c.endereco?.toLowerCase().includes(busca.toLowerCase());
    const matchTipo = filtroTipo === 'todos' || c.tipo === filtroTipo;
    return matchBusca && matchTipo;
  });

  const totalPF = clientes.filter(c => c.tipo === 'PF').length;
  const totalPJ = clientes.filter(c => c.tipo === 'PJ').length;

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <Users className="text-primary" size={26} /> Clientes
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{clientes.length} cadastrados</p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-secondary px-4 py-2.5 rounded-xl font-black text-sm active:scale-95 transition-all shadow-sm"
        >
          <Plus size={18} /> Novo Cliente
        </button>
      </div>

      {/* Stat cards / filtros */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: clientes.length, key: 'todos', color: 'text-gray-800' },
          { label: 'Pessoa Física', value: totalPF, key: 'PF', color: 'text-gray-700' },
          { label: 'Empresas', value: totalPJ, key: 'PJ', color: 'text-blue-600' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setFiltroTipo(filtroTipo === s.key && s.key !== 'todos' ? 'todos' : s.key)}
            className={`bg-white rounded-2xl border-2 shadow-sm p-4 text-center transition-all active:scale-95 ${
              filtroTipo === s.key ? 'border-primary bg-amber-50' : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            <p className={`text-2xl font-black ${filtroTipo === s.key ? 'text-primary' : s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 font-medium mt-0.5 leading-tight">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          type="text"
          placeholder="Buscar por nome, telefone ou endereço..."
          className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-primary outline-none text-sm"
        />
        {busca && (
          <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={15} />
          </button>
        )}
      </div>

      {busca && (
        <p className="text-sm text-gray-500 -mt-2">
          {clientesFiltrados.length} resultado(s) para "<strong>{busca}</strong>"
        </p>
      )}

      {/* Grid */}
      {clientesFiltrados.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-gray-300">
          <Users size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-bold text-gray-500">Nenhum cliente encontrado</p>
          <p className="text-sm text-gray-400 mt-1">Tente ajustar os filtros ou cadastre um novo</p>
          <button
            onClick={abrirNovo}
            className="mt-4 inline-flex items-center gap-2 bg-primary text-secondary px-4 py-2 rounded-xl font-bold text-sm active:scale-95 transition-all"
          >
            <Plus size={16} /> Cadastrar Cliente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {clientesFiltrados.map(c => (
            <ClienteCard
              key={c.id}
              c={c}
              onEditar={abrirEdicao}
              onExcluir={pedirConfirmacao}
            />
          ))}
        </div>
      )}

      {/* Mobile FAB */}
      <button
        onClick={abrirNovo}
        className="md:hidden fixed bottom-6 right-6 w-16 h-16 bg-primary hover:bg-primary-hover text-secondary rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-20"
      >
        <Plus size={32} />
      </button>

      {/* Modais */}
      <ClienteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSalvo={handleSalvo}
        clienteEditando={clienteEditando}
      />

      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, cliente: null, loading: false })}
        onConfirm={handleConfirmarExclusao}
        loading={confirmState.loading}
        title="Excluir cliente"
        message={`Tem certeza que deseja excluir "${confirmState.cliente?.nome}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
      />

      <SuccessMessage show={showSuccess} message={successMsg} />
    </div>
  );
}