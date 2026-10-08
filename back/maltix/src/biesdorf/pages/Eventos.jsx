import { useState, useEffect, useRef } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, X, MapPin, Clock, FileText, CheckCircle2, AlertCircle, XCircle, Trash2, Edit2, CalendarDays, Loader2 } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

// ─── helpers ──────────────────────────────────────────────────────────────────

const STATUS = {
  confirmado: {
    label: 'Confirmado',
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  pendente: {
    label: 'Pendente',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-400',
    icon: AlertCircle,
  },
  cancelado: {
    label: 'Cancelado',
    bg: 'bg-red-100',
    text: 'text-red-600',
    border: 'border-red-200',
    dot: 'bg-red-400',
    icon: XCircle,
  },
};

const toDateKey = (date) => {
  // YYYY-MM-DD local
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


// ─── Modal de cadastro / edição ───────────────────────────────────────────────

function EventoModal({ isOpen, onClose, onSalvo, eventoEditando, dataInicial }) {
  const initialForm = {
    nome: '',
    data: dataInicial || '',
    horario: '',
    local: '',
    observacoes: '',
    status: 'pendente',
  };

  const [form, setForm] = useState(initialForm);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (eventoEditando) {
      setForm({
        nome:        eventoEditando.nome        || '',
        data:        eventoEditando.data        || '',
        horario:     eventoEditando.horario     || '',
        local:       eventoEditando.local       || '',
        observacoes: eventoEditando.observacoes || '',
        status:      eventoEditando.status      || 'pendente',
      });
    } else {
      setForm({ ...initialForm, data: dataInicial || '' });
    }
    setErro('');
  }, [isOpen, eventoEditando, dataInicial]);

  if (!isOpen) return null;

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSalvar = async () => {
    if (!form.nome.trim()) { setErro('Informe o nome do evento'); return; }
    if (!form.data)        { setErro('Informe a data');            return; }

    setSalvando(true);
    try {
      const payload = {
        nome:        form.nome.trim(),
        data:        form.data,
        horario:     form.horario,
        local:       form.local.trim(),
        observacoes: form.observacoes.trim(),
        status:      form.status,
        updatedAt:   new Date().toISOString(),
      };

      if (eventoEditando) {
        await updateDoc(doc(db, 'eventos', eventoEditando.id), payload);
      } else {
        await addDoc(collection(db, 'eventos'), {
          ...payload,
          createdAt: new Date().toISOString(),
        });
      }

      onSalvo();
      onClose();
    } catch (err) {
      console.error(err);
      setErro('Erro ao salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-black text-gray-800">
            {eventoEditando ? 'Editar Evento' : 'Novo Evento'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">

          {/* Nome */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Nome do Evento *
            </label>
            <input
              type="text"
              value={form.nome}
              onChange={e => set('nome', e.target.value)}
              placeholder="Ex: Festa da Uva, Feira do Produtor..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Data + Horário */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Data *
              </label>
              <input
                type="date"
                value={form.data}
                onChange={e => set('data', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                Horário
              </label>
              <input
                type="time"
                value={form.horario}
                onChange={e => set('horario', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Local */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Local / Endereço
            </label>
            <input
              type="text"
              value={form.local}
              onChange={e => set('local', e.target.value)}
              placeholder="Ex: Praça Central, Clube Municipal..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
              Status
            </label>
            <div className="flex gap-2">
              {Object.entries(STATUS).map(([key, s]) => (
                <button
                  key={key}
                  onClick={() => set('status', key)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                    form.status === key
                      ? `${s.bg} ${s.text} ${s.border}`
                      : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Observações
            </label>
            <textarea
              value={form.observacoes}
              onChange={e => set('observacoes', e.target.value)}
              placeholder="Detalhes extras, contato do organizador..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {erro && (
            <p className="text-red-500 text-xs flex items-center gap-1">
              <AlertCircle size={13} /> {erro}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-secondary font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all"
          >
            {salvando ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            {eventoEditando ? 'Salvar' : 'Cadastrar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function Eventos() {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [eventoEditando, setEventoEditando] = useState(null);
  const [dataInicialModal, setDataInicialModal] = useState('');
  const calendarRef = useRef(null);
  const touchStartX = useRef(0);
  const [confirmState, setConfirmState] = useState({ isOpen: false, evento: null, loading: false });

  const fetchEventos = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'eventos'), orderBy('data', 'asc')));
      setEventos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEventos(); }, []);

  const handleDeleteEvento = async () => {
  setConfirmState(s => ({ ...s, loading: true }));
  try {
    await deleteDoc(doc(db, 'eventos', confirmState.evento.id));
    setEventos(prev => prev.filter(e => e.id !== confirmState.evento.id));
    setConfirmState({ isOpen: false, evento: null, loading: false });
  } catch (err) {
    console.error(err);
    setConfirmState(s => ({ ...s, loading: false }));
  }
};

  const handleDayClick = (date) => {
    setDataSelecionada(date);
  };

  const abrirNovoComData = (date) => {
    setEventoEditando(null);
    setDataInicialModal(toDateKey(date));
    setModalOpen(true);
  };

  const abrirEditar = (evento) => {
    setEventoEditando(evento);
    setDataInicialModal('');
    setModalOpen(true);
  };

  // Eventos do dia selecionado
  const eventosDoDia = eventos.filter(e => e.data === toDateKey(dataSelecionada));

  // Eventos do mês visível (para marcar pontos no calendário)
  const eventosPorData = eventos.reduce((acc, e) => {
    if (!acc[e.data]) acc[e.data] = [];
    acc[e.data].push(e);
    return acc;
  }, {});

  // Próximos eventos (a partir de hoje)
  const hoje = toDateKey(new Date());
  const proximosEventos = eventos
    .filter(e => e.data >= hoje && e.status !== 'cancelado')
    .slice(0, 5);

  // Tile content: dots por status
  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    const key = toDateKey(date);
    const evts = eventosPorData[key];
    if (!evts || evts.length === 0) return null;

    return (
      <div className="flex justify-center gap-0.5 mt-0.5 flex-wrap">
        {evts.slice(0, 3).map((e, i) => (
          <span
            key={i}
            className={`w-1.5 h-1.5 rounded-full inline-block ${STATUS[e.status]?.dot || 'bg-gray-400'}`}
          />
        ))}
      </div>
    );
  };

  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return '';
    const key = toDateKey(date);
    if (eventosPorData[key]) return 'has-events';
    return '';
  };

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
          <h1 className="text-2xl font-black text-accent flex items-center gap-2">
            <CalendarDays className="text-primary" size={26} />
            Eventos
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Feiras, festas e participações externas</p>
        </div>
        <button
          onClick={() => { setEventoEditando(null); setDataInicialModal(toDateKey(dataSelecionada)); setModalOpen(true); }}
          className="hidden md:flex bg-primary hover:bg-primary-hover text-secondary px-4 py-2.5 rounded-xl font-bold items-center gap-2 active:scale-95 transition-all shadow-sm"
        >
          <Plus size={18} /> Novo Evento
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Coluna esquerda: Calendário + Próximos ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Calendário com Swipe Horizontal no Mobile */}
            <div
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
              ref={calendarRef}
              onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
              onTouchEnd={e => {
                const delta = e.changedTouches[0].clientX - touchStartX.current;
                if (Math.abs(delta) < 50) return;
                setDataSelecionada(prev => {
                  const d = new Date(prev);
                  d.setMonth(d.getMonth() + (delta < 0 ? 1 : -1));
                  return d;
                });
              }}
            >
            <style>{`
              /* Reset e base */
              .react-calendar {
                width: 100%;
                border: none;
                font-family: inherit;
                background: transparent;
              }
              .react-calendar__navigation {
                display: flex;
                align-items: center;
                margin-bottom: 12px;
              }
              .react-calendar__navigation button {
                background: none;
                border: none;
                font-size: 0.95rem;
                font-weight: 800;
                color: #1a1a2e;
                cursor: pointer;
                padding: 6px 10px;
                border-radius: 10px;
                transition: background 0.15s;
              }
              .react-calendar__navigation button:hover {
                background: #f3f4f6;
              }
              .react-calendar__navigation__label {
                flex: 1;
                text-align: center;
                text-transform: capitalize;
                font-size: 1rem !important;
                font-weight: 800 !important;
                color: #1a1a2e;
              }
              .react-calendar__month-view__weekdays {
                text-align: center;
                margin-bottom: 4px;
              }
              .react-calendar__month-view__weekdays__weekday {
                padding: 4px 0;
              }
              .react-calendar__month-view__weekdays__weekday abbr {
                text-decoration: none;
                font-size: 0.7rem;
                font-weight: 700;
                color: #9ca3af;
                text-transform: uppercase;
              }
              .react-calendar__tile {
                background: none;
                border: none;
                border-radius: 12px;
                padding: 8px 4px;
                font-size: 0.85rem;
                font-weight: 600;
                color: #374151;
                cursor: pointer;
                transition: background 0.15s, color 0.15s;
                display: flex;
                flex-direction: column;
                align-items: center;
                min-height: 52px;
              }
              .react-calendar__tile:hover {
                background: #f3f4f6;
              }
              .react-calendar__tile--now {
                background: #fef3c7 !important;
                color: #92400e !important;
                font-weight: 800;
              }
              .react-calendar__tile--active,
              .react-calendar__tile--active:hover {
                background: var(--color-primary, #d97706) !important;
                color: white !important;
              }
              .react-calendar__tile.has-events {
                font-weight: 800;
              }
              .react-calendar__month-view__days__day--neighboringMonth {
                color: #d1d5db;
              }
              .react-calendar__month-view__days__day--weekend {
                color: #ef4444;
              }
              .react-calendar__tile--active.react-calendar__month-view__days__day--weekend {
                color: white !important;
              }
            `}</style>
            <Calendar
              onChange={handleDayClick}
              value={dataSelecionada}
              locale="pt-BR"
              tileContent={tileContent}
              tileClassName={tileClassName}
              onClickDay={(date) => handleDayClick(date)}
            />
          </div>

          {/* Eventos do dia selecionado */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-accent">
                {formatDateBR(toDateKey(dataSelecionada))}
              </h3>
              <button
                onClick={() => abrirNovoComData(dataSelecionada)}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
              >
                <Plus size={14} /> Adicionar neste dia
              </button>
            </div>

            {eventosDoDia.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <CalendarDays size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum evento neste dia</p>
                <button
                  onClick={() => abrirNovoComData(dataSelecionada)}
                  className="mt-3 text-xs text-primary font-semibold hover:underline"
                >
                  + Cadastrar evento aqui
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {eventosDoDia.map(evento => {
                  const s = STATUS[evento.status] || STATUS.pendente;
                  const StatusIcon = s.icon;
                  return (
                    <div key={evento.id} className="p-5 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-bold text-accent">{evento.nome}</h4>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold border ${s.bg} ${s.text} ${s.border}`}>
                            <StatusIcon size={11} />
                            {s.label}
                          </span>
                        </div>
                        {evento.horario && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Clock size={13} /> {evento.horario}
                          </p>
                        )}
                        {evento.local && (
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                            <MapPin size={13} /> {evento.local}
                          </p>
                        )}
                        {evento.observacoes && (
                          <p className="text-sm text-gray-400 flex items-start gap-1 mt-1">
                            <FileText size={13} className="mt-0.5 shrink-0" />
                            {evento.observacoes}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => abrirEditar(evento)}
                          className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-amber-100 hover:text-amber-700 transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => setConfirmState({ isOpen: true, evento: evento, loading: false })}
                          className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Coluna direita: Próximos eventos ── */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-accent">Próximos Eventos</h3>
              <p className="text-xs text-gray-400 mt-0.5">Confirmados e pendentes</p>
            </div>

            {proximosEventos.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                Nenhum evento futuro cadastrado
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {proximosEventos.map(evento => {
                  const s = STATUS[evento.status] || STATUS.pendente;
                  return (
                    <button
                      key={evento.id}
                      onClick={() => setDataSelecionada(new Date(evento.data + 'T12:00:00'))}
                      className="w-full text-left px-5 py-3.5 hover:bg-gray-50 transition-colors flex items-center gap-3"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-accent truncate">{evento.nome}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatDateBR(evento.data)}
                          {evento.horario && ` às ${evento.horario}`}
                        </p>
                        {evento.local && (
                          <p className="text-xs text-gray-400 truncate">{evento.local}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${s.bg} ${s.text}`}>
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resumo rápido */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h3 className="font-bold text-accent text-sm">Resumo</h3>
            {Object.entries(STATUS).map(([key, s]) => {
              const count = eventos.filter(e => e.status === key).length;
              const StatusIcon = s.icon;
              return (
                <div key={key} className="flex items-center justify-between">
                  <span className={`flex items-center gap-1.5 text-sm font-medium ${s.text}`}>
                    <StatusIcon size={14} /> {s.label}
                  </span>
                  <span className={`text-sm font-black px-2.5 py-0.5 rounded-full ${s.bg} ${s.text}`}>
                    {count}
                  </span>
                </div>
              );
            })}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500 font-medium">Total</span>
              <span className="text-sm font-black text-accent">{eventos.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => { setEventoEditando(null); setDataInicialModal(toDateKey(dataSelecionada)); setModalOpen(true); }}
        className="md:hidden fixed bottom-6 right-6 w-16 h-16 bg-primary hover:bg-primary-hover text-secondary rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-20"
      >
        <Plus size={32} />
      </button>

      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, evento: null, loading: false })}
        onConfirm={handleDeleteEvento}
        loading={confirmState.loading}
        title="Excluir evento"
        message={`Tem certeza que deseja excluir "${confirmState.evento?.nome}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
      />

      <EventoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSalvo={fetchEventos}
        eventoEditando={eventoEditando}
        dataInicial={dataInicialModal}
      />
    </div>
  );
}