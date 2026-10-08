import { useState, useEffect, useCallback } from 'react';
import { collection, query, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Truck, MapPin, Clock, Phone, CheckCircle2, Circle,
  Navigation, Navigation2, GripVertical, ChevronDown,
  ChevronUp, Package, RotateCcw, Locate, Building2,
  AlertCircle, ArrowRight, Star, Droplets
} from 'lucide-react';
import WhatsAppIcon from '../components/WhatsAppIcon';

// ─── constantes ───────────────────────────────────────────────────────────────

const CERVEJARIA_ENDERECO = 'Microcervejaria Biesdorf, Pinhalzinho, SC';
const CERVEJARIA_LABEL    = 'Cervejaria Biesdorf';

// ─── helpers ──────────────────────────────────────────────────────────────────

const formatarHora = (dataIso) => {
  if (!dataIso) return '--:--';
  return new Date(dataIso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const totalLitros = (pedido) =>
  (pedido.itens || []).reduce((acc, i) => acc + Number(i.quantidade || 0), 0);

const hoje = new Date();
const isHoje = (dataIso) => {
  if (!dataIso) return false;
  const d = new Date(dataIso);
  return d.getDate() === hoje.getDate() &&
         d.getMonth() === hoje.getMonth() &&
         d.getFullYear() === hoje.getFullYear();
};

// ─── componente de card de parada ─────────────────────────────────────────────

function CardParada({ pedido, index, total, onToggleEntregue, onWhatsApp, onMapsIndividual, isDragging, dragHandleProps }) {
  const [expandido, setExpandido] = useState(false);
  const entregue = pedido.status === 'Entregue' || pedido.status === 'Concluído';

  return (
    <div
      className={`rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
        entregue
          ? 'border-emerald-200 bg-emerald-50 opacity-75'
          : isDragging
            ? 'border-primary bg-amber-50 shadow-2xl scale-[1.02]'
            : 'border-gray-200 bg-white shadow-sm'
      }`}
    >
      {/* ── Header da parada ── */}
      <div className="p-4">
        <div className="flex items-start gap-3">

          {/* Número da parada + drag handle */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div
              {...dragHandleProps}
              className="touch-none cursor-grab active:cursor-grabbing p-1 rounded-lg hover:bg-gray-100 text-gray-300"
              title="Arrastar para reordenar"
            >
              <GripVertical size={16} />
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${
              entregue ? 'bg-emerald-500 text-white' : 'bg-primary text-secondary'
            }`}>
              {entregue ? <CheckCircle2 size={16} /> : index + 1}
            </div>
          </div>

          {/* Info principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className={`font-black text-base leading-tight truncate ${entregue ? 'text-emerald-700 line-through' : 'text-gray-800'}`}>
                  {pedido.cliente}
                </h3>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Clock size={11} /> {formatarHora(pedido.dataIso)}
                </p>
              </div>

              {/* Litros + Status badge */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  <Droplets size={11} /> {totalLitros(pedido)}L
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                  entregue
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : pedido.status === 'Entregue'
                      ? 'bg-blue-100 text-blue-700 border-blue-200'
                      : 'bg-amber-100 text-amber-700 border-amber-200'
                }`}>
                  {entregue ? '✓ Entregue' : pedido.status || 'Aberto'}
                </span>
              </div>
            </div>

            {/* Endereço */}
            <p className="text-sm text-gray-600 flex items-start gap-1 mt-2 font-medium">
              <MapPin size={13} className="text-primary shrink-0 mt-0.5" />
              <span className="leading-tight">{pedido.endereco || 'Endereço não informado'}</span>
            </p>
          </div>
        </div>

        {/* ── Ações rápidas ── */}
        <div className="flex gap-2 mt-3 ml-11">

          {/* Navegar até aqui */}
          <button
            onClick={() => onMapsIndividual(pedido)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold active:scale-95 transition-all flex-1 justify-center"
          >
            <Navigation size={13} /> Navegar
          </button>

          {/* WhatsApp */}
          <button
            onClick={() => onWhatsApp(pedido)}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-500 text-white rounded-xl text-xs font-bold active:scale-95 transition-all"
          >
            <WhatsAppIcon className="w-3.5 h-3.5" />
          </button>

          {/* Marcar entregue */}
          <button
            onClick={() => onToggleEntregue(pedido)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold active:scale-95 transition-all flex-1 justify-center ${
              entregue
                ? 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500'
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            }`}
          >
            {entregue
              ? <><RotateCcw size={13} /> Desfazer</>
              : <><CheckCircle2 size={13} /> Entregue</>
            }
          </button>

          {/* Expandir detalhes */}
          <button
            onClick={() => setExpandido(!expandido)}
            className="p-2 bg-gray-100 text-gray-500 rounded-xl active:scale-95 transition-all"
          >
            {expandido ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* ── Detalhes expandíveis ── */}
      {expandido && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 ml-0 space-y-2">
          {pedido.itens?.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
              <Package size={13} className="text-gray-400 shrink-0" />
              <span className="font-medium">{item.tipoCerveja}</span>
              <span className="text-gray-400">{item.quantidade}L</span>
              <span className="ml-auto text-xs bg-gray-200 px-2 py-0.5 rounded-full">{item.embalagem}</span>
            </div>
          ))}
          <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
            <span className="text-xs text-gray-400">
              Pagamento: <span className={`font-bold ${pedido.pagamento === 'Pago' ? 'text-emerald-600' : 'text-red-500'}`}>
                {pedido.pagamento || 'Pendente'}
              </span>
            </span>
            <span className="text-sm font-black text-gray-700">R$ {Number(pedido.valor).toFixed(2)}</span>
          </div>
          {pedido.observacoes && (
            <p className="text-xs text-gray-500 italic bg-white rounded-lg p-2 border border-gray-200">
              {pedido.observacoes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function Entregas() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordemParadas, setOrdemParadas] = useState([]); // IDs na ordem atual
  const [origemRota, setOrigemRota] = useState('cervejaria'); // 'cervejaria' | 'atual'
  const [loadingLocalizacao, setLoadingLocalizacao] = useState(false);
  const [coordsAtual, setCoordsAtual] = useState(null);

  // Drag state
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const fetchPedidos = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'pedidos'), orderBy('createdAt', 'desc')));
      const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Apenas pedidos de hoje para entrega (não retirada)
      const entregasHoje = todos
        .filter(p => isHoje(p.dataIso) && p.tipo !== 'Retirar')
        .sort((a, b) => {
          const ha = a.dataIso || '';
          const hb = b.dataIso || '';
          return ha.localeCompare(hb);
        });

      // Retiradas de hoje (seção separada)
      const retirasHoje = todos.filter(p => isHoje(p.dataIso) && p.tipo === 'Retirar');

      setPedidos({ entregas: entregasHoje, retiradas: retirasHoje });
      setOrdemParadas(entregasHoje.map(p => p.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPedidos(); }, []);

  // ── Obter localização atual ──────────────────────────────────────────────
  const obterLocalizacaoAtual = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada neste dispositivo');
      return;
    }
    setLoadingLocalizacao(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoordsAtual({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setOrigemRota('atual');
        setLoadingLocalizacao(false);
      },
      () => {
        alert('Não foi possível obter sua localização. Verifique as permissões.');
        setLoadingLocalizacao(false);
      },
      { timeout: 10000 }
    );
  };

  // ── Montar URL do Google Maps com múltiplas paradas ──────────────────────
  const iniciarRotaCompleta = () => {
    const paradasOrdenadas = ordemParadas
      .map(id => (pedidos.entregas || []).find(p => p.id === id))
      .filter(p => p && p.endereco && p.status !== 'Concluído');

    if (paradasOrdenadas.length === 0) {
      alert('Nenhuma parada de entrega pendente para hoje.');
      return;
    }

    let origem = '';
    if (origemRota === 'cervejaria') {
      origem = encodeURIComponent(CERVEJARIA_ENDERECO);
    } else if (coordsAtual) {
      origem = `${coordsAtual.lat},${coordsAtual.lng}`;
    } else {
      alert('Localização atual não obtida. Tente novamente ou use a cervejaria como origem.');
      return;
    }

    const destinos = paradasOrdenadas.map(p => encodeURIComponent(p.endereco));
    const destino  = destinos[destinos.length - 1];
    const waypoints = destinos.slice(0, -1).join('/');

    const url = waypoints
      ? `https://www.google.com/maps/dir/${origem}/${waypoints}/${destino}`
      : `https://www.google.com/maps/dir/${origem}/${destino}`;

    window.open(url, '_blank');
  };

  // ── Navegação individual ────────────────────────────────────────────────
  const abrirMapsIndividual = (pedido) => {
    if (!pedido.endereco) { alert('Endereço não informado'); return; }

    let url;
    if (origemRota === 'atual' && coordsAtual) {
      url = `https://www.google.com/maps/dir/${coordsAtual.lat},${coordsAtual.lng}/${encodeURIComponent(pedido.endereco)}`;
    } else {
      url = `https://www.google.com/maps/dir/${encodeURIComponent(CERVEJARIA_ENDERECO)}/${encodeURIComponent(pedido.endereco)}`;
    }
    window.open(url, '_blank');
  };

  // ── Toggle entregue ────────────────────────────────────────────────────
  const handleToggleEntregue = async (pedido) => {
    const nextStatus = (pedido.status === 'Entregue' || pedido.status === 'Concluído')
      ? 'Aberto'
      : 'Entregue';

    try {
      setPedidos(prev => ({
        ...prev,
        entregas: prev.entregas.map(p =>
          p.id === pedido.id ? { ...p, status: nextStatus } : p
        )
      }));
      await updateDoc(doc(db, 'pedidos', pedido.id), { status: nextStatus });
    } catch (err) {
      console.error(err);
      fetchPedidos();
    }
  };

  // ── WhatsApp ───────────────────────────────────────────────────────────
  const abrirWhatsApp = (pedido) => {
    if (!pedido.telefone) { alert('Cliente sem telefone cadastrado'); return; }
    window.open(`https://wa.me/55${pedido.telefone.replace(/\D/g, '')}`, '_blank');
  };

  // ── Drag and drop (touch + mouse) ─────────────────────────────────────
  const handleDragStart = (index) => setDragIndex(index);
  const handleDragOver  = (e, index) => { e.preventDefault(); setDragOverIndex(index); };
  const handleDrop      = (index) => {
    if (dragIndex === null || dragIndex === index) { setDragIndex(null); setDragOverIndex(null); return; }
    const nova = [...ordemParadas];
    const [moved] = nova.splice(dragIndex, 1);
    nova.splice(index, 0, moved);
    setOrdemParadas(nova);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // ── Métricas ──────────────────────────────────────────────────────────
  const entregas       = pedidos.entregas || [];
  const retiradas      = pedidos.retiradas || [];
  const entregues      = entregas.filter(p => p.status === 'Entregue' || p.status === 'Concluído').length;
  const pendentes      = entregas.length - entregues;
  const progresso      = entregas.length > 0 ? Math.round((entregues / entregas.length) * 100) : 0;
  const totalValor     = entregas.reduce((acc, p) => acc + Number(p.valor || 0), 0);
  const valorEntregue  = entregas.filter(p => p.status === 'Entregue' || p.status === 'Concluído')
                                 .reduce((acc, p) => acc + Number(p.valor || 0), 0);

  // Paradas na ordem atual
  const paradasOrdenadas = ordemParadas
    .map(id => entregas.find(p => p.id === id))
    .filter(Boolean);

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24 md:max-w-none">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <Truck className="text-primary" size={26} /> Entregas
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
        </div>

        {/* Progresso circular compacto */}
        {entregas.length > 0 && (
          <div className="relative w-14 h-14">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="22" fill="none" stroke="#f3f4f6" strokeWidth="5" />
              <circle
                cx="28" cy="28" r="22" fill="none"
                stroke="#22c55e" strokeWidth="5"
                strokeDasharray={`${2 * Math.PI * 22}`}
                strokeDashoffset={`${2 * Math.PI * 22 * (1 - progresso / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs font-black text-gray-800">{progresso}%</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Cards de métricas ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
          <p className="text-2xl font-black text-orange-500">{pendentes}</p>
          <p className="text-xs text-gray-400 font-medium mt-0.5">pendentes</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
          <p className="text-2xl font-black text-emerald-500">{entregues}</p>
          <p className="text-xs text-gray-400 font-medium mt-0.5">entregues</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
          <p className="text-lg font-black text-gray-800">R${valorEntregue.toFixed(0)}</p>
          <p className="text-xs text-gray-400 font-medium mt-0.5">de R${totalValor.toFixed(0)}</p>
        </div>
      </div>

      {/* ── Barra de progresso ── */}
      {entregas.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex justify-between text-xs text-gray-500 mb-2 font-medium">
            <span>Progresso do dia</span>
            <span>{entregues}/{entregas.length} entregas</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Painel de origem + botão de rota ── */}
      {entregas.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Ponto de partida</p>

          <div className="flex gap-2">
            <button
              onClick={() => setOrigemRota('cervejaria')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                origemRota === 'cervejaria'
                  ? 'border-primary bg-amber-50 text-amber-800'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <Building2 size={16} /> Cervejaria
            </button>

            <button
              onClick={() => {
                if (coordsAtual) {
                  setOrigemRota('atual');
                } else {
                  obterLocalizacaoAtual();
                }
              }}
              disabled={loadingLocalizacao}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                origemRota === 'atual'
                  ? 'border-blue-400 bg-blue-50 text-blue-800'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              } disabled:opacity-50`}
            >
              {loadingLocalizacao
                ? <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                : <Locate size={16} />
              }
              {coordsAtual && origemRota === 'atual' ? 'Localização ✓' : 'Minha localização'}
            </button>
          </div>

          {/* Origem selecionada */}
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <MapPin size={11} />
            {origemRota === 'cervejaria'
              ? CERVEJARIA_LABEL
              : coordsAtual
                ? `Sua localização atual (${coordsAtual.lat.toFixed(4)}, ${coordsAtual.lng.toFixed(4)})`
                : 'Nenhuma localização obtida'
            }
          </p>

          {/* Botão iniciar rota */}
          <button
            onClick={iniciarRotaCompleta}
            disabled={pendentes === 0}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary hover:bg-primary-hover text-secondary rounded-xl font-black text-base active:scale-95 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Navigation2 size={20} />
            Iniciar Rota Completa
            {pendentes > 0 && (
              <span className="bg-white/30 text-secondary text-xs font-black px-2 py-0.5 rounded-full">
                {pendentes} paradas
              </span>
            )}
          </button>

          {pendentes === 0 && entregues > 0 && (
            <div className="flex items-center justify-center gap-2 py-2 text-emerald-600 font-bold text-sm">
              <Star size={16} className="fill-emerald-500" /> Todas as entregas concluídas!
            </div>
          )}
        </div>
      )}

      {/* ── Lista de paradas ── */}
      {entregas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center">
          <Truck size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-bold text-gray-500">Nenhuma entrega para hoje</p>
          <p className="text-sm text-gray-400 mt-1">Pedidos de entrega aparecerão aqui</p>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Paradas — arraste para reorganizar
            </p>
            <button
              onClick={() => setOrdemParadas(entregas.map(p => p.id))}
              className="text-xs text-gray-400 hover:text-primary transition-colors flex items-center gap-1"
            >
              <RotateCcw size={11} /> Resetar ordem
            </button>
          </div>

          {paradasOrdenadas.map((pedido, index) => (
            <div
              key={pedido.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
              className={`transition-all duration-150 ${
                dragOverIndex === index && dragIndex !== index
                  ? 'translate-y-1 opacity-50'
                  : ''
              }`}
            >
              {/* Linha conectora entre paradas */}
              {index > 0 && (
                <div className="flex items-center gap-2 py-1 ml-5">
                  <div className="w-0.5 h-4 bg-gray-200 mx-auto" style={{ marginLeft: '15px' }} />
                  <ArrowRight size={10} className="text-gray-300 -ml-1" />
                </div>
              )}

              <CardParada
                pedido={pedido}
                index={index}
                total={paradasOrdenadas.length}
                onToggleEntregue={handleToggleEntregue}
                onWhatsApp={abrirWhatsApp}
                onMapsIndividual={abrirMapsIndividual}
                isDragging={dragIndex === index}
                dragHandleProps={{
                  onMouseDown: () => {},
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Retiradas (seção separada) ── */}
      {retiradas.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-200" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide px-2">
              Retiradas no local ({retiradas.length})
            </p>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {retiradas.map(pedido => {
            const concluido = pedido.status === 'Concluído';
            return (
              <div
                key={pedido.id}
                className={`rounded-2xl border p-4 flex items-center gap-3 ${
                  concluido ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className={`p-2 rounded-xl ${concluido ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                  <Package size={18} className={concluido ? 'text-emerald-600' : 'text-gray-500'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm ${concluido ? 'text-emerald-700 line-through' : 'text-gray-800'}`}>
                    {pedido.cliente}
                  </p>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={10} /> {formatarHora(pedido.dataIso)}
                    <span className="ml-2">· R$ {Number(pedido.valor).toFixed(2)}</span>
                    <span className="ml-2 flex items-center gap-0.5"><Droplets size={10} /> {totalLitros(pedido)}L</span>
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => abrirWhatsApp(pedido)}
                    className="p-2 bg-green-100 text-green-700 rounded-xl active:scale-90 transition-all"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggleEntregue(pedido)}
                    className={`p-2 rounded-xl active:scale-90 transition-all ${
                      concluido ? 'bg-gray-100 text-gray-400' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {concluido ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}