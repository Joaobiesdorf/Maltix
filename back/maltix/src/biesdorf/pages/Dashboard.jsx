import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { TrendingUp, Truck, Trash2, Beer, Edit2, Barrel, MapPin, MapIcon, Clock, CalendarDays, MapPinned, Droplets } from 'lucide-react';
import NovoPedidoModal from '../components/NovoPedidoModal';
import { Plus } from 'lucide-react';
import WhatsAppIcon from "../components/WhatsAppIcon";
import EquipamentosModal from '../components/EquipamentosModal';
import ConfirmModal from '../components/ConfirmModal';

const toDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDateBR = (dateKey) => {
  if (!dateKey) return '';
  const [y, m, d] = dateKey.split('-');
  return `${d}/${m}/${y}`;
};

export default function Dashboard() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [equipModalPedido, setEquipModalPedido] = useState(null);
  const [proximoEvento, setProximoEvento] = useState(null);
  const [pedidoEditando, setPedidoEditando] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, pedido: null, loading: false });

  const fetchPedidos = async () => {
    try {
      const q = query(collection(db, "pedidos"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPedidos(data);
    } catch (err) {
      console.error("Erro ao buscar pedidos dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProximoEvento = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'eventos'), orderBy('data', 'asc')));
      const hoje = toDateKey(new Date());
      const eventos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const proximo = eventos.find(e => e.data >= hoje && e.status !== 'cancelado');
      setProximoEvento(proximo || null);
    } catch (err) {
      console.error('Erro ao buscar próximo evento:', err);
    }
  };

  useEffect(() => {
    fetchPedidos();
    fetchProximoEvento();
  }, []);

  const handleToggleStatus = async (pedido) => {
    try {
      const nextStatus = pedido.status === 'Aberto' ? 'Entregue' : pedido.status === 'Entregue' ? 'Concluído' : 'Aberto';
      setPedidos(pedidos.map(p => p.id === pedido.id ? { ...p, status: nextStatus } : p));
      await updateDoc(doc(db, 'pedidos', pedido.id), { status: nextStatus });
      if (nextStatus === 'Concluído') await liberarEquipamentos(pedido);
    } catch (err) {
      console.error(err);
      fetchPedidos();
    }
  };

  const handleTogglePagamento = async (pedido) => {
    try {
      const nextPagamento = pedido.pagamento === 'Pendente' ? 'Pago' : 'Pendente';
      setPedidos(pedidos.map(p => p.id === pedido.id ? { ...p, pagamento: nextPagamento } : p));
      await updateDoc(doc(db, 'pedidos', pedido.id), { pagamento: nextPagamento });
    } catch (err) {
      console.error(err);
      fetchPedidos();
    }
  };

  const handleDeletePedido = async () => {
    const pedido = confirmDelete.pedido;
    setConfirmDelete(s => ({ ...s, loading: true }));
    try {
      if (pedido) await liberarEquipamentos(pedido);
      setPedidos(prev => prev.filter(p => p.id !== pedido.id));
      await deleteDoc(doc(db, 'pedidos', pedido.id));
      setConfirmDelete({ isOpen: false, pedido: null, loading: false });
    } catch (err) {
      console.error(err);
      fetchPedidos();
      setConfirmDelete(s => ({ ...s, loading: false }));
    }
  };

  const formatarHora = (dataIso) => {
    if (!dataIso) return '--:--';
    const data = new Date(dataIso);
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const totalLitros = (pedido) =>
    (pedido.itens || []).reduce((acc, i) => acc + Number(i.quantidade || 0), 0);

  const getBeerColor = (tipo) => {
    switch (tipo?.toLowerCase()) {
      case 'pilsen': return 'text-yellow-400';
      case 'viena': return 'text-red-700';
      case 'ipa': return 'text-green-800';
      default: return 'text-gray-400';
    }
  };

  const abrirWhatsAppPedido = (pedido) => {
    if (!pedido.telefone) { alert("Cliente não possui telefone cadastrado"); return; }
    const numero = pedido.telefone.replace(/\D/g, '');
    window.open(`https://wa.me/55${numero}`, '_blank');
  };

  const abrirMapsPedido = (pedido) => {
    if (pedido.tipo === 'Retirar') { alert('Pedido para retirada não possui localização de entrega'); return; }
    if (!pedido.endereco) { alert('Pedido não possui endereço definido'); return; }
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pedido.endereco)}`, '_blank');
  };

  const liberarEquipamentos = async (pedido) => {
    const equipamentos = pedido.equipamentos || [];
    if (equipamentos.length === 0) return;
    try {
      const snap = await getDocs(collection(db, 'equipamentos'));
      const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const updates = equipamentos.map(({ tipo, codigo }) => {
        const equip = todos.find(e => e.tipo === tipo && e.codigo === codigo);
        if (!equip) return null;
        return updateDoc(doc(db, 'equipamentos', equip.id), { status: 'estoque', pedidoId: null });
      }).filter(Boolean);
      await Promise.all(updates);
    } catch (err) {
      console.error(err);
    }
  };

  const dataHojeStr = new Date().toLocaleDateString('pt-BR');
  const hoje = new Date();

  const pedidosHoje = pedidos.filter(p => {
    if (!p.dataIso) return false;
    const dataPedido = new Date(p.dataIso);
    return (
      dataPedido.getDate() === hoje.getDate() &&
      dataPedido.getMonth() === hoje.getMonth() &&
      dataPedido.getFullYear() === hoje.getFullYear()
    );
  });

  const abertosHoje = pedidosHoje.filter(p => p.status === 'Aberto').length;
  const entreguesHoje = pedidosHoje.filter(p => p.status === 'Entregue').length;
  const totalHoje = pedidosHoje.reduce((acc, p) => acc + Number(p.valor), 0);

  // 🔥 Semana atual (domingo → sábado)
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - hoje.getDay());
  inicioSemana.setHours(0, 0, 0, 0);

  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 6);
  fimSemana.setHours(23, 59, 59, 999);

  const pedidosSemana = pedidos.filter(p => {
    if (!p.dataIso) return false;
    const data = new Date(p.dataIso);
    return data >= inicioSemana && data <= fimSemana;
  });

  const totalSemana = pedidosSemana.reduce((acc, p) => acc + Number(p.valor), 0);

  const statusEvento = {
    confirmado: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Confirmado' },
    pendente: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pendente' },
    cancelado: { bg: 'bg-red-100', text: 'text-red-600', label: 'Cancelado' },
  };

  // 🔥 Próximos 6 dias (sem hoje)
  const inicioSemanaFuturo = new Date(hoje);
  inicioSemanaFuturo.setDate(hoje.getDate() + 1);
  inicioSemanaFuturo.setHours(0, 0, 0, 0);

  const fimSemanaFuturo = new Date(hoje);
  fimSemanaFuturo.setDate(hoje.getDate() + 6);
  fimSemanaFuturo.setHours(23, 59, 59, 999);

  const pedidosSemanaFutura = pedidos.filter(p => {
    if (!p.dataIso) return false;
    const data = new Date(p.dataIso);
    return data >= inicioSemanaFuturo && data <= fimSemanaFuturo;
  });

  const formatDDMM = (date) => {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
  };
  const periodoSemanaLabel = `${formatDDMM(inicioSemana)} a ${formatDDMM(fimSemana)}`;
  const tituloSemana = `${formatDDMM(inicioSemanaFuturo)} a ${formatDDMM(fimSemanaFuturo)}`;

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <button
          onClick={() => setIsOverlayOpen(true)}
          className="hidden md:flex bg-primary hover:bg-primary-hover text-secondary px-4 py-2 rounded-lg font-bold items-center gap-2 active:scale-95 transition-all shadow-sm cursor-pointer"
        >
          <Plus size={20} /> Novo Pedido
        </button>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Card 1: Total R$ */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gray-50 text-emerald-500 shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium mb-2">Faturamento</p>

            <div className="flex items-end justify-between gap-6">

              {/* HOJE */}
              <div className="flex flex-col leading-tight">
                <span className="text-xs text-gray-400">Hoje</span>
                <h3 className="text-xl font-black text-accent">
                  R$ {totalHoje.toFixed(2)}
                </h3>
              </div>

              {/* SEMANA */}
              <div className="flex flex-col leading-tight text-right border-l pl-4">
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-xs text-gray-400">Semana</span>
                  <span className="text-[10px] text-gray-500 font-medium">
                    {periodoSemanaLabel}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-emerald-600">
                  R$ {totalSemana.toFixed(2)}
                </h3>
              </div>

            </div>
          </div>
        </div>

        {/* Card 2: Pedidos — Abertos | Entregues | Total */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gray-50 text-blue-500 shrink-0">
            <Truck size={24} />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500 font-medium mb-2">Pedidos Hoje</p>
            <div className="flex items-center gap-2">

              <div className="text-center">
                <p className={`text-2xl font-black leading-none ${abertosHoje > 0 ? 'text-orange-500' : 'text-gray-300'}`}>
                  {abertosHoje}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">abertos</p>
              </div>

              <div className="w-px h-8 bg-gray-200" />

              <div className="text-center">
                <p className={`text-2xl font-black leading-none ${entreguesHoje > 0 ? 'text-blue-500' : 'text-gray-300'}`}>
                  {entreguesHoje}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">entregues</p>
              </div>

              <div className="w-px h-8 bg-gray-200" />

              <div className="text-center">
                <p className="text-2xl font-black text-accent leading-none">{pedidosHoje.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">total</p>
              </div>

            </div>
          </div>
        </div>

        {/* Card 3: Próximo Evento */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gray-50 text-purple-500 shrink-0">
            <CalendarDays size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 font-medium">Próximo Evento</p>
            {proximoEvento ? (
              <>
                <h3 className="text-base font-black text-accent truncate leading-tight mt-0.5">
                  {proximoEvento.nome}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                  <Clock size={11} />
                  {formatDateBR(proximoEvento.data)}
                  {proximoEvento.horario && ` às ${proximoEvento.horario}`}
                </p>
                {proximoEvento.local && (
                  <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                    <MapPinned size={11} />
                    {proximoEvento.local}
                  </p>
                )}
                {(() => {
                  const s = statusEvento[proximoEvento.status] || statusEvento.pendente;
                  return (
                    <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-semibold ${s.bg} ${s.text}`}>
                      {s.label}
                    </span>
                  );
                })()}
              </>
            ) : (
              <p className="text-sm text-gray-400 mt-1 italic">Nenhum evento agendado</p>
            )}
          </div>
        </div>

      </div>

      {/* ── Lista de pedidos de hoje ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50">
          <h3 className="font-bold text-lg text-accent">Pedidos para Hoje ({dataHojeStr})</h3>
        </div>

        <div className="divide-y-0 flex flex-col gap-0">
          {pedidosHoje.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Nenhum pedido para hoje. Aproveite o descanso!</div>
          ) : (
            pedidosHoje.map((pedido, index) => (
              <div
                key={pedido.id}
                className={`relative p-5 hover:bg-gray-50 transition-colors flex flex-col gap-4 ${index !== pedidosHoje.length - 1
                  ? 'border-b-4 border-gray-100'
                  : ''
                  }`}
              >
                {/* ── Cabeçalho do pedido ── */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-accent text-lg leading-tight">{pedido.cliente}</h4>
                    <p className="text-sm text-gray-500 font-medium flex items-center gap-1 mt-1">
                      <MapPin size={13} />
                      {pedido.tipo === 'Retirar' ? 'Cliente retira' : (pedido.endereco || 'Entregar em casa')}
                    </p>
                    <p className="text-sm text-gray-500 font-semibold flex items-center gap-1 mt-0.5">
                      <Clock size={13} />
                      {formatarHora(pedido.dataIso)}
                    </p>
                  </div>

                  {/* Botões de ação */}
                  <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                    <button
                      onClick={() => abrirWhatsAppPedido(pedido)}
                      className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-green-100 hover:text-green-700 transition-colors active:scale-90"
                      title="WhatsApp"
                    >
                      <WhatsAppIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => abrirMapsPedido(pedido)}
                      className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors active:scale-90"
                      title="Localização"
                    >
                      <MapIcon size={16} />
                    </button>
                    <button
                      onClick={() => setEquipModalPedido(pedido)}
                      className={`p-1.5 rounded-lg transition-colors active:scale-90 ${(pedido.equipamentos?.length ?? 0) > 0
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-amber-100 hover:text-amber-700'
                        }`}
                      title="Equipamentos"
                    >
                      <Beer size={16} />
                    </button>
                    <button
                      // onClick={() => alert('Editar pedido')}
                      onClick={() => {
                        setPedidoEditando(pedido);
                        setIsOverlayOpen(true);
                      }}
                      className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-amber-100 hover:text-amber-700 transition-colors active:scale-90"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ isOpen: true, pedido, loading: false })}
                      className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors active:scale-90"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* ── Itens + equipamentos ── */}
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="space-y-2">
                    {pedido.itens?.map((i, idx) => {
                      const colorClass = getBeerColor(i.tipoCerveja);
                      return (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                          {i.embalagem === 'Barril'
                            ? <Barrel size={16} className={colorClass} />
                            : <Beer size={16} className={colorClass} />
                          }
                          <span className={`font-medium ${colorClass}`}>{i.tipoCerveja}</span>
                          <span className="text-gray-500">{i.quantidade}L</span>
                          <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full ml-auto">{i.embalagem}</span>
                        </div>
                      );
                    })}
                  </div>

                  {(pedido.equipamentos?.length ?? 0) > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-1.5">
                      {pedido.equipamentos.map((e, idx) => (
                        <span
                          key={idx}
                          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${e.tipo === 'barril' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                            }`}
                        >
                          {e.tipo === 'barril' ? <Barrel size={11} /> : <Beer size={11} />}
                          {e.tipo === 'barril' ? 'Barril' : 'Chopeira'} {e.codigo} {e.tamanho ? `- ${e.tamanho}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Rodapé: valor + status ── */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                    <span>Pedido: R$ {(Number(pedido.valor) - Number(pedido.frete || 0)).toFixed(2)}</span>
                    {pedido.frete > 0 && (
                      <><span>+</span><span>Frete: R$ {Number(pedido.frete).toFixed(2)}</span></>
                    )}
                    <span className="font-semibold text-emerald-600">= R$ {Number(pedido.valor).toFixed(2)}</span>
                  </div>

                  <div className="flex gap-2 items-center shrink-0">
                    <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                      <Droplets size={12} /> {totalLitros(pedido)}L
                    </span>
                    <button
                      onClick={() => handleTogglePagamento(pedido)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer active:scale-90 transition-all ${pedido.pagamento === 'Pago'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                        }`}
                    >
                      {pedido.pagamento === 'Pendente' ? 'Pagamento Pendente' : pedido.pagamento || 'Pendente'}
                    </button>
                    <button
                      onClick={() => handleToggleStatus(pedido)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer active:scale-90 transition-all ${pedido.status === 'Entregue'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : pedido.status === 'Concluído'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                    >
                      {pedido.status || 'Aberto'}
                    </button>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-6">
        <div className="p-5 border-b border-gray-100 bg-gray-50">
          <h3 className="font-bold text-lg text-accent">
            Pedidos da Semana ({tituloSemana})
          </h3>
        </div>

        <div className="divide-y-0 flex flex-col gap-0">
          {pedidosSemanaFutura.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum pedido nos próximos dias.
            </div>
          ) : (
            pedidosSemanaFutura.map((pedido, index) => (
              <div
                key={pedido.id}
                className={`relative p-5 hover:bg-gray-50 transition-colors flex flex-col gap-4 ${index !== pedidosSemanaFutura.length - 1
                  ? 'border-b-4 border-gray-100'
                  : ''
                  }`}
              >
                {/* ── Cabeçalho do pedido ── */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-accent text-lg leading-tight">
                      {pedido.cliente}
                    </h4>

                    {/* DATA + HORA */}
                    <p className="text-sm text-gray-500 font-semibold flex items-center gap-1 mt-0.5">
                      <CalendarDays size={13} />
                      {new Date(pedido.dataIso).toLocaleDateString('pt-BR')} às {formatarHora(pedido.dataIso)}
                    </p>

                    <p className="text-sm text-gray-500 font-medium flex items-center gap-1 mt-1">
                      <MapPin size={13} />
                      {pedido.tipo === 'Retirar'
                        ? 'Cliente retira'
                        : (pedido.endereco || 'Entregar em casa')}
                    </p>
                  </div>

                  {/* Botões */}
                  <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                    <button
                      onClick={() => abrirWhatsAppPedido(pedido)}
                      className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-green-100 hover:text-green-700 transition-colors active:scale-90"
                    >
                      <WhatsAppIcon className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => abrirMapsPedido(pedido)}
                      className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors active:scale-90"
                    >
                      <MapIcon size={16} />
                    </button>

                    <button
                      onClick={() => setEquipModalPedido(pedido)}
                      className={`p-1.5 rounded-lg transition-colors active:scale-90 ${(pedido.equipamentos?.length ?? 0) > 0
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-amber-100 hover:text-amber-700'
                        }`}
                    >
                      <Beer size={16} />
                    </button>

                    <button
                      onClick={() => {
                        setPedidoEditando(pedido);
                        setIsOverlayOpen(true);
                      }}
                      className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-amber-100 hover:text-amber-700 transition-colors active:scale-90"
                    >
                      <Edit2 size={16} />
                    </button>

                    <button
                      onClick={() => setConfirmDelete({ isOpen: true, pedido, loading: false })}
                      className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors active:scale-90"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* ── Itens + equipamentos ── */}
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="space-y-2">
                    {pedido.itens?.map((i, idx) => {
                      const colorClass = getBeerColor(i.tipoCerveja);
                      return (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                          {i.embalagem === 'Barril'
                            ? <Barrel size={16} className={colorClass} />
                            : <Beer size={16} className={colorClass} />
                          }
                          <span className={`font-medium ${colorClass}`}>{i.tipoCerveja}</span>
                          <span className="text-gray-500">{i.quantidade}L</span>
                          <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full ml-auto">
                            {i.embalagem}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {(pedido.equipamentos?.length ?? 0) > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-1.5">
                      {pedido.equipamentos.map((e, idx) => (
                        <span
                          key={idx}
                          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${e.tipo === 'barril'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                            }`}
                        >
                          {e.tipo === 'barril' ? <Barrel size={11} /> : <Beer size={11} />}
                          {e.tipo === 'barril' ? 'Barril' : 'Chopeira'} {e.codigo} {e.tamanho ? `- ${e.tamanho}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Rodapé ── */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                    <span>Pedido: R$ {(Number(pedido.valor) - Number(pedido.frete || 0)).toFixed(2)}</span>
                    {pedido.frete > 0 && (
                      <>
                        <span>+</span>
                        <span>Frete: R$ {Number(pedido.frete).toFixed(2)}</span>
                      </>
                    )}
                    <span className="font-semibold text-emerald-600">
                      = R$ {Number(pedido.valor).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex gap-2 items-center shrink-0">
                    <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                      <Droplets size={12} /> {totalLitros(pedido)}L
                    </span>
                    <button
                      onClick={() => handleTogglePagamento(pedido)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer active:scale-90 transition-all ${pedido.pagamento === 'Pago'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                        }`}
                    >
                      {pedido.pagamento === 'Pendente'
                        ? 'Pagamento Pendente'
                        : pedido.pagamento || 'Pendente'}
                    </button>

                    <button
                      onClick={() => handleToggleStatus(pedido)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer active:scale-90 transition-all ${pedido.status === 'Entregue'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : pedido.status === 'Concluído'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                    >
                      {pedido.status || 'Aberto'}
                    </button>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => setIsOverlayOpen(true)}
        className="md:hidden fixed bottom-6 right-6 w-16 h-16 bg-primary hover:bg-primary-hover text-secondary rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-20 cursor-pointer"
      >
        <Plus size={32} />
      </button>

      <NovoPedidoModal
        isOpen={isOverlayOpen}
        onClose={() => {
          setIsOverlayOpen(false);
          setPedidoEditando(null);
        }}
        onPedidoSalvo={fetchPedidos}
        pedidoEditando={pedidoEditando}
      />
      <EquipamentosModal
        isOpen={!!equipModalPedido}
        pedido={equipModalPedido}
        onClose={() => setEquipModalPedido(null)}
        onSalvo={() => { fetchPedidos(); setEquipModalPedido(null); }}
      />
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, pedido: null, loading: false })}
        onConfirm={handleDeletePedido}
        loading={confirmDelete.loading}
        title="Excluir pedido"
        message={`Tem certeza que deseja excluir o pedido de "${confirmDelete.pedido?.cliente}"?`}
        confirmText="Excluir"
      />
    </div>
  );
}