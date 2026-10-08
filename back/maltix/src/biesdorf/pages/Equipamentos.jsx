import { useState, useEffect } from 'react';
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Barrel, Beer, Plus, Trash2, RefreshCw, Loader2, CheckCircle2, AlertCircle, Package, PackageCheck, Search } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

const pad = (n) => String(n).padStart(2, '0');

// ─── Modal de cadastro rápido ──────────────────────────────────────────────────

function CadastroModal({ isOpen, onClose, onSalvo }) {
  const [tipo, setTipo] = useState('barril');
  const [tamanho, setTamanho] = useState('50L');
  const [codigos, setCodigos] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  if (!isOpen) return null;

  const handleSalvar = async () => {
    setErro('');
    // Suporta múltiplos códigos separados por vírgula ou espaço
    const lista = codigos
      .split(/[\s,]+/)
      .map((c) => c.trim())
      .filter(Boolean);

    if (lista.length === 0) {
      setErro('Informe ao menos um código');
      return;
    }

    const invalidos = lista.filter((c) => {
      const n = parseInt(c, 10);
      return isNaN(n) || n < 1 || n > 99;
    });

    if (invalidos.length > 0) {
      setErro(`Códigos inválidos: ${invalidos.join(', ')} (use 01–99)`);
      return;
    }

    setSalvando(true);
    try {
      // Busca existentes para evitar duplicatas
      const snap = await getDocs(collection(db, 'equipamentos'));
      const existentes = snap.docs.map((d) => d.data());

      const promises = lista.map(async (c) => {
        const codigo = pad(parseInt(c, 10));
        const jaExiste = existentes.find((e) => e.tipo === tipo && e.codigo === codigo);
        if (jaExiste) return; // ignora duplicata
        await addDoc(collection(db, 'equipamentos'), {
          tipo,
          codigo,
          tamanho,
          status: 'estoque',
          pedidoId: null,
          criadoEm: new Date().toISOString(),
        });
      });

      await Promise.all(promises);
      onSalvo();
      onClose();
      setCodigos('');
    } catch (err) {
      console.error(err);
      setErro('Erro ao cadastrar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-black text-gray-800">Cadastrar Equipamentos</h2>

        {/* Tipo */}
        <div className="flex gap-2">
          {['barril', 'chopeira'].map((t) => (
            <button
              key={t}
              onClick={() => { setTipo(t); setTamanho(t === 'barril' ? '50L' : 'Simples'); }}
              className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${tipo === t
                  ? t === 'barril'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-blue-100 text-blue-800 border-blue-300'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
            >
              {t === 'barril' ? <Barrel size={15} /> : <Beer size={15} />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Tamanho */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
            Tamanho / Modelo
          </label>
          <select
            value={tamanho}
            onChange={(e) => setTamanho(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          >
            {tipo === 'barril'
              ? ['10L', '15L', '20L', '30L', '50L'].map((tam) => (
                <option key={tam} value={tam}>{tam}</option>
              ))
              : ['Simples', 'Dupla', 'Dupla grande'].map((tam) => (
                <option key={tam} value={tam}>{tam}</option>
              ))
            }
          </select>
        </div>

        {/* Códigos */}
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
            Código(s) — separados por vírgula ou espaço
          </label>
          <input
            type="text"
            value={codigos}
            onChange={(e) => { setCodigos(e.target.value); setErro(''); }}
            placeholder="Ex: 01, 02, 15"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {erro && (
            <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
              <AlertCircle size={12} /> {erro}
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-secondary font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {salvando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Cadastrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function Equipamentos() {
  const [equipamentos, setEquipamentos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('todos'); // 'todos' | 'barril' | 'chopeira'
  const [filtroStatus, setFiltroStatus] = useState('todos'); // 'todos' | 'estoque' | 'em_uso'
  const [filtroTamanho, setFiltroTamanho] = useState('todos');
  const [busca, setBusca] = useState('');
  const [cadastroOpen, setCadastroOpen] = useState(false);
  const [liberando, setLiberando] = useState(null); // id do equip sendo liberado
  const [confirmState, setConfirmState] = useState({ isOpen: false, equip: null, loading: false });

  const fetchTudo = async () => {
    setLoading(true);
    try {
      const [snapEquip, snapPedidos] = await Promise.all([
        getDocs(query(collection(db, 'equipamentos'), orderBy('tipo'), orderBy('codigo'))),
        getDocs(collection(db, 'pedidos')),
      ]);

      setEquipamentos(snapEquip.docs.map((d) => ({ id: d.id, ...d.data() })));
      setPedidos(snapPedidos.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTudo(); }, []);

  const getNomeCliente = (pedidoId) => {
    const pedido = pedidos.find((p) => p.id === pedidoId);
    return pedido ? pedido.cliente : 'Pedido não encontrado';
  };

  const handleLiberarManual = async (equip) => {
    const ok = confirm(`Liberar ${equip.tipo} ${equip.codigo} manualmente de volta ao estoque?`);
    if (!ok) return;

    setLiberando(equip.id);
    try {
      await updateDoc(doc(db, 'equipamentos', equip.id), {
        status: 'estoque',
        pedidoId: null,
      });
      setEquipamentos((prev) =>
        prev.map((e) => e.id === equip.id ? { ...e, status: 'estoque', pedidoId: null } : e)
      );
    } catch (err) {
      console.error(err);
      alert('Erro ao liberar equipamento');
    } finally {
      setLiberando(null);
    }
  };

  const handleExcluir = async () => {
    if (confirmState.equip.status === 'em_uso') {
      alert('Não é possível excluir um equipamento que está em uso. Libere-o primeiro.');
      setConfirmState({ isOpen: false, equip: null, loading: false });
      return;
    }
    setConfirmState(s => ({ ...s, loading: true }));
    try {
      await deleteDoc(doc(db, 'equipamentos', confirmState.equip.id));
      setEquipamentos(prev => prev.filter(e => e.id !== confirmState.equip.id));
      setConfirmState({ isOpen: false, equip: null, loading: false });
    } catch (err) {
      console.error(err);
      setConfirmState(s => ({ ...s, loading: false }));
    }
  };

  // ── Filtros ────────────────────────────────────────────────────────────────
  const equipamentosFiltrados = equipamentos.filter((e) => {
    if (filtroTipo !== 'todos' && e.tipo !== filtroTipo) return false;
    if (filtroStatus !== 'todos' && e.status !== filtroStatus) return false;
    if (filtroTamanho !== 'todos' && e.tamanho !== filtroTamanho) return false;
    if (busca && !e.codigo.includes(busca.padStart(2, '0')) &&
      !getNomeCliente(e.pedidoId).toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  // ── Estatísticas ───────────────────────────────────────────────────────────
  const totalBarris = equipamentos.filter((e) => e.tipo === 'barril').length;
  const barrисEmUso = equipamentos.filter((e) => e.tipo === 'barril' && e.status === 'em_uso').length;
  const totalChopeiras = equipamentos.filter((e) => e.tipo === 'chopeira').length;
  const chопeirasEmUso = equipamentos.filter((e) => e.tipo === 'chopeira' && e.status === 'em_uso').length;

  const statCards = [
    { label: 'Barris em Estoque', value: totalBarris - barrисEmUso, total: totalBarris, icon: Barrel, cor: 'amber' },
    { label: 'Barris em Uso', value: barrисEmUso, total: totalBarris, icon: Barrel, cor: 'red' },
    { label: 'Chopeiras em Estoque', value: totalChopeiras - chопeirasEmUso, total: totalChopeiras, icon: Beer, cor: 'blue' },
    { label: 'Chopeiras em Uso', value: chопeirasEmUso, total: totalChopeiras, icon: Beer, cor: 'orange' },
  ];

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-accent">Equipamentos</h1>
          <p className="text-sm text-gray-500">Barris e chopeiras em estoque ou em campo</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchTudo}
            className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            title="Atualizar"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => setCadastroOpen(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-secondary px-4 py-2.5 rounded-xl font-bold text-sm active:scale-95 transition-all"
          >
            <Plus size={18} /> Cadastrar
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl bg-${s.cor}-50 text-${s.cor}-500`}>
              <s.icon size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium leading-tight">{s.label}</p>
              <p className="text-2xl font-black text-accent">
                {s.value}
                <span className="text-sm font-medium text-gray-400">/{s.total}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Busca */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Código ou cliente..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Tipo */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {[['todos', 'Todos'], ['barril', 'Barris'], ['chopeira', 'Chopeiras']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFiltroTipo(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filtroTipo === val ? 'bg-white shadow text-accent' : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Status */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {[['todos', 'Todos'], ['estoque', 'Estoque'], ['em_uso', 'Em Uso']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFiltroStatus(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filtroStatus === val ? 'bg-white shadow text-accent' : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Tamanho / Modelo */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-wrap">
            {[
              ['todos', 'Todos'],
              ...(filtroTipo === 'chopeira'
                ? [['Simples', 'Simples'], ['Dupla', 'Dupla'], ['Dupla grande', 'Dupla G.']]
                : [['10L', '10L'], ['15L', '15L'], ['20L', '20L'], ['30L', '30L'], ['50L', '50L']]
              )
            ].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFiltroTamanho(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filtroTamanho === val ? 'bg-white shadow text-accent' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <p className="text-sm font-semibold text-gray-600">
            {equipamentosFiltrados.length} equipamento(s) encontrado(s)
          </p>
        </div>

        {equipamentosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Package size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">Nenhum equipamento encontrado</p>
            <p className="text-sm mt-1">Cadastre barris ou chopeiras para começar</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {equipamentosFiltrados.map((equip) => (
              <div
                key={equip.id}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors gap-4"
              >
                {/* Tipo + Código */}
                <div className="flex items-center gap-3 min-w-[140px]">
                  <div className={`p-2 rounded-xl ${equip.tipo === 'barril' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                    {equip.tipo === 'barril' ? <Barrel size={18} /> : <Beer size={18} />}
                  </div>
                  <div>
                    <p className="font-bold text-accent text-sm">
                      {equip.tipo === 'barril' ? 'Barril' : 'Chopeira'} {equip.codigo}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">{equip.tamanho}</p>
                  </div>
                </div>

                {/* Status */}
                <div className="flex-1">
                  {equip.status === 'estoque' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                      <PackageCheck size={12} /> Em Estoque
                    </span>
                  ) : (
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 mb-1">
                        <AlertCircle size={12} /> Em Uso
                      </span>
                      {equip.pedidoId && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {getNomeCliente(equip.pedidoId)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div className="flex gap-2">
                  {equip.status === 'em_uso' && (
                    <button
                      onClick={() => handleLiberarManual(equip)}
                      disabled={liberando === equip.id}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      title="Liberar para estoque manualmente"
                    >
                      {liberando === equip.id
                        ? <Loader2 size={12} className="animate-spin" />
                        : <CheckCircle2 size={12} />
                      }
                      Liberar
                    </button>
                  )}
                  <button
                    // onClick={() => handleExcluir(equip)}
                    onClick={() => setConfirmState({ isOpen: true, equip: equip, loading: false })}
                    className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                    title="Excluir equipamento"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, equip: null, loading: false })}
        onConfirm={handleExcluir}
        loading={confirmState.loading}
        title="Excluir equipamento"
        message={`Tem certeza que deseja excluir ${confirmState.equip?.tipo} ${confirmState.equip?.codigo}? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
      />
      {/* Modal de cadastro */}
      <CadastroModal
        isOpen={cadastroOpen}
        onClose={() => setCadastroOpen(false)}
        onSalvo={fetchTudo}
      />
    </div>
  );
}