import { useState, useEffect } from 'react';
import { Plus, Beer, Barrel, ClipboardList, Calendar, Edit2, Trash2, MapPin, MapIcon, Droplets } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, doc, updateDoc, query, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import NovoPedidoModal from '../components/NovoPedidoModal';
import EquipamentosModal from '../components/EquipamentosModal'; // ← NOVO
import WhatsAppIcon from "../components/WhatsAppIcon";
import ConfirmModal from '../components/ConfirmModal';

export default function Pedidos() {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState([]);
  const [filtro, setFiltro] = useState('todos');

  const [equipModalPedido, setEquipModalPedido] = useState(null);
  const [pedidoEditando, setPedidoEditando] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, pedido: null, loading: false });

  const fetchPedidos = async () => {
    try {
      const q = query(collection(db, "pedidos"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPedidos(data);
    } catch (err) {
      console.error("Erro ao buscar pedidos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidos();
  }, []);

  // ── NOVO: libera equipamentos do pedido de volta ao estoque ──────────────
  const liberarEquipamentos = async (pedido) => {
    const equipamentos = pedido.equipamentos || [];
    if (equipamentos.length === 0) return;

    try {
      const snap = await getDocs(collection(db, 'equipamentos'));
      const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      const updates = equipamentos.map(({ tipo, codigo }) => {
        const equip = todos.find(e => e.tipo === tipo && e.codigo === codigo);
        if (!equip) return null;
        return updateDoc(doc(db, 'equipamentos', equip.id), {
          status: 'estoque',
          pedidoId: null,
        });
      }).filter(Boolean);

      await Promise.all(updates);
    } catch (err) {
      console.error('Erro ao liberar equipamentos:', err);
    }
  };

  const handleToggleStatus = async (pedido) => {
    try {
      const nextStatus =
        pedido.status === 'Aberto'
          ? 'Entregue'
          : pedido.status === 'Entregue'
            ? 'Concluído'
            : 'Aberto';

      setPedidos(pedidos.map(p =>
        p.id === pedido.id ? { ...p, status: nextStatus } : p
      ));

      await updateDoc(doc(db, 'pedidos', pedido.id), { status: nextStatus });

      // ── NOVO: libera equipamentos ao concluir ────────────────────────────
      if (nextStatus === 'Concluído') {
        await liberarEquipamentos(pedido);
      }
    } catch (err) {
      console.error(err);
      fetchPedidos();
    }
  };

  const handleTogglePagamento = async (pedido) => {
    try {
      const nextPagamento = pedido.pagamento === 'Pendente' ? 'Pago' : 'Pendente';
      setPedidos(pedidos.map(p =>
        p.id === pedido.id ? { ...p, pagamento: nextPagamento } : p
      ));
      await updateDoc(doc(db, 'pedidos', pedido.id), { pagamento: nextPagamento });
    } catch (err) {
      console.error(err);
      fetchPedidos();
    }
  };
  /*
    const handleDeletePedido = async (id) => {
      const confirmacao = confirm("Tem certeza que deseja excluir este pedido?");
      if (!confirmacao) return;

      try {
        // ── NOVO: libera equipamentos antes de deletar ────────────────────────
        const pedido = pedidos.find(p => p.id === id);
        if (pedido) await liberarEquipamentos(pedido);

        setPedidos(pedidos.filter(p => p.id !== id));
        await deleteDoc(doc(db, 'pedidos', id));
      } catch (err) {
        console.error(err);
        fetchPedidos();
      }
    };
  */
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

  const abrirWhatsAppPedido = (pedido) => {
    if (!pedido.telefone) {
      alert("Cliente não possui telefone cadastrado");
      return;
    }
    const numero = pedido.telefone.replace(/\D/g, '');
    window.open(`https://wa.me/55${numero}`, '_blank');
  };

  const abrirMapsPedido = (pedido) => {
    if (pedido.tipo === 'Retirar') {
      alert('Pedido para retirada não possui localização de entrega');
      return;
    }
    if (!pedido.endereco) {
      alert('Pedido não possui endereço definido');
      return;
    }
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pedido.endereco)}`, '_blank');
  };

  const totalLitros = (pedido) =>
    (pedido.itens || []).reduce((acc, i) => acc + Number(i.quantidade || 0), 0);

  const getBeerColor = (tipo) => {
    switch (tipo?.toLowerCase()) {
      case 'pilsen': return 'text-yellow-400';
      case 'viena': return 'text-red-700';
      case 'ipa': return 'text-green-800';
      default: return 'text-gray-100';
    }
  };

  const filtrarPedidos = () => {
    const hoje = new Date();

    const filtrados = pedidos.filter(p => {
      if (!p.dataIso) return false;
      const data = new Date(p.dataIso);

      if (filtro === 'hoje') {
        return (
          data.getDate() === hoje.getDate() &&
          data.getMonth() === hoje.getMonth() &&
          data.getFullYear() === hoje.getFullYear()
        );
      }

      if (filtro === 'entregue') return p.status === 'Entregue';

      if (filtro === 'nao_pagos') return p.pagamento !== 'Pago';

      if (filtro === 'hoje_entrega') {
        return (
          data.getDate() === hoje.getDate() &&
          data.getMonth() === hoje.getMonth() &&
          data.getFullYear() === hoje.getFullYear() &&
          p.tipo === 'Entregar' &&
          p.status !== 'Concluído'
        );
      }

      if (filtro === 'concluidos') return p.status === 'Concluído';

      if (filtro === 'semana') {
        const inicioSemana = new Date(hoje);
        inicioSemana.setDate(hoje.getDate() - hoje.getDay());
        inicioSemana.setHours(0, 0, 0, 0);

        const fimSemana = new Date(inicioSemana);
        fimSemana.setDate(inicioSemana.getDate() + 6);
        fimSemana.setHours(23, 59, 59, 999);

        return data >= inicioSemana && data <= fimSemana;
      }

      if (filtro === 'mes') {
        return (
          data.getMonth() === hoje.getMonth() &&
          data.getFullYear() === hoje.getFullYear()
        );
      }

      return true; // TODOS
    });

    // 🔥 AQUI ESTÁ O PULO DO GATO
    return filtrados.sort((a, b) => {
      return new Date(b.dataIso) - new Date(a.dataIso); // mais futuro primeiro
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-full pb-20 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-accent">
          <ClipboardList className="text-primary" /> Histórico de Pedidos
        </h1>
        <button
          onClick={() => {
            setPedidoEditando(null);
            setModalOpen(true);
          }}
          className="hidden md:flex bg-primary hover:bg-primary-hover text-secondary px-4 py-2 rounded-lg font-bold items-center gap-2 active:scale-95 transition-all shadow-sm cursor-pointer"
        >
          <Plus size={20} /> Novo Pedido
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {[
          { key: 'todos', label: 'Todos' },
          { key: 'hoje_entrega', label: 'Entrega Hoje' },
          { key: 'nao_pagos', label: 'Não Pagos' },
          { key: 'entregue', label: 'Entregues ao cliente' },
          { key: 'hoje', label: 'Hoje' },
          { key: 'semana', label: 'Semana' },
          { key: 'mes', label: 'Mês' },
          { key: 'concluidos', label: 'Concluídos' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap border transition-all ${filtro === f.key
              ? 'bg-primary text-white border-primary'
              : 'bg-white text-gray-600 border-gray-200'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {pedidos.length === 0 && (
        <div className="p-10 text-center text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300">
          Nenhum pedido registrado.
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AnimatePresence>
          {filtrarPedidos().map(p => (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={p.id}
              className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col"
            >
              {/* Borda lateral colorida */}
              <div className={`absolute top-0 left-0 w-1.5 h-full ${p.tipo === 'Entregar' ? 'bg-blue-400' : 'bg-emerald-400'}`} />

              {/* Header do card */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg text-accent pr-2">{p.cliente}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <Calendar size={14} /> {p.data}
                  </p>
                  <p className="text-sm text-gray-500 font-medium flex items-center gap-1">
                    <MapPin size={14} />
                    {p.tipo === 'Retirar' ? 'Cliente retira' : (p.endereco || 'Entregar em casa')}
                  </p>
                </div>

                {/* Botões de ação */}
                <div className="flex gap-2">

                  {/* WHATSAPP */}
                  <button
                    onClick={() => abrirWhatsAppPedido(p)}
                    className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-green-100 hover:text-green-700 transition-colors active:scale-90"
                    title="Chamar no WhatsApp"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                  </button>

                  {/* MAPS */}
                  <button
                    onClick={() => abrirMapsPedido(p)}
                    className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors active:scale-90"
                    title="Abrir localização"
                  >
                    <MapIcon size={16} />
                  </button>

                  {/* ── NOVO: EQUIPAMENTOS ── */}
                  <button
                    onClick={() => setEquipModalPedido(p)}
                    className={`p-1.5 rounded-lg transition-colors active:scale-90 ${(p.equipamentos?.length ?? 0) > 0
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-amber-100 hover:text-amber-700'
                      }`}
                    title={
                      (p.equipamentos?.length ?? 0) > 0
                        ? `${p.equipamentos.length} equipamento(s) vinculado(s)`
                        : 'Vincular equipamentos'
                    }
                  >
                    <Beer size={16} />
                  </button>

                  {/* EDITAR */}
                  <button
                    onClick={() => {
                      setPedidoEditando(p);
                      setModalOpen(true);
                    }}
                    className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-amber-100 hover:text-amber-700 transition-colors active:scale-90"
                    title="Editar Pedido"
                  >
                    <Edit2 size={16} />
                  </button>

                  {/* LIXEIRA */}
                  <button
                    onClick={() => setConfirmDelete({ isOpen: true, pedido: p, loading: false })}
                    className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors active:scale-90"
                    title="Excluir Pedido"
                  >
                    <Trash2 size={16} />
                  </button>

                </div>
              </div>

              {/* Itens do pedido + chips de equipamentos */}
              <div className="bg-gray-50 rounded-xl p-3 my-4 border border-gray-100 flex-1">
                <ul className="text-sm space-y-2">
                  {p.itens?.map((i, idx) => {
                    const colorClass = getBeerColor(i.tipoCerveja);
                    return (
                      <li key={idx} className="flex items-center gap-2 text-gray-700">
                        {i.embalagem === 'Barril'
                          ? <Barrel size={16} className={colorClass} />
                          : <Beer size={16} className={colorClass} />
                        }
                        <span className="font-medium">{i.tipoCerveja}</span>
                        {i.quantidade}L
                        <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full ml-auto">
                          {i.embalagem}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {/* ── NOVO: chips de equipamentos vinculados ── */}
                {(p.equipamentos?.length ?? 0) > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-1.5">
                    {p.equipamentos.map((e, idx) => (
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

              {/* Rodapé: valores + status */}
              <div className="mt-auto pt-3 border-t border-gray-100 flex flex-col gap-2">
                <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap mb-2">
                  <span>Pedido: R$ {(Number(p.valor) - Number(p.frete || 0)).toFixed(2)}</span>
                  {p.frete > 0 && (
                    <><span>+</span><span>Frete: R$ {Number(p.frete).toFixed(2)}</span></>
                  )}
                  <span className="font-semibold text-emerald-600">
                    = R$ {Number(p.valor).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center flex-wrap gap-2">
                  {/* LITROS */}
                  <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                    <Droplets size={12} /> {totalLitros(p)}L
                  </span>

                  <div className="flex items-center gap-2 ml-auto">
                    {/* PAGAMENTO */}
                    <button
                      onClick={() => handleTogglePagamento(p)}
                      className={`text-xs font-bold px-3 py-1 rounded-full cursor-pointer active:scale-90 transition-all ${p.pagamento === 'Pago'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                        }`}
                    >
                      {p.pagamento === 'Pendente' ? 'Pagamento Pendente' : p.pagamento || 'Pendente'}
                    </button>

                    {/* STATUS */}
                    <button
                      onClick={() => handleToggleStatus(p)}
                      className={`text-xs font-bold px-3 py-1 rounded-full cursor-pointer active:scale-90 transition-transform ${p.status === 'Entregue'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : p.status === 'Concluído'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                    >
                      {p.status || 'Aberto'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => {
          setPedidoEditando(null);
          setModalOpen(true);
        }}
        className="md:hidden fixed bottom-6 right-6 w-16 h-16 bg-primary hover:bg-primary-hover text-secondary rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-20 cursor-pointer"
      >
        <Plus size={32} />
      </button>

      <NovoPedidoModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setPedidoEditando(null);
        }}
        onPedidoSalvo={fetchPedidos}
        pedidoEditando={pedidoEditando}
      />

      {/* ── NOVO: Modal de equipamentos ── */}
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
