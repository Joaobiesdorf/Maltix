import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import {
  ChartArea, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus,
  Wallet, ClipboardList, Droplets, Users, Beer, Barrel, Trophy, Boxes,
  CalendarDays, CheckCircle2, AlertCircle, XCircle, Receipt,
} from 'lucide-react';

// ─── helpers ──────────────────────────────────────────────────────────────────

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const fmtMoeda = (v) => `R$ ${Number(v || 0).toFixed(2)}`;
const fmtMoedaCompacta = (v) => {
  const n = Number(v || 0);
  if (n >= 1000) return `R$ ${(n / 1000).toFixed(1)}k`;
  return `R$ ${n.toFixed(0)}`;
};

const BEER_COLORS = {
  Pilsen: { fill: '#e0a106', bg: 'bg-yellow-100', text: 'text-yellow-700', icon: 'text-yellow-600' },
  Viena: { fill: '#b91c1c', bg: 'bg-red-100', text: 'text-red-700', icon: 'text-red-700' },
  IPA: { fill: '#166534', bg: 'bg-green-100', text: 'text-green-800', icon: 'text-green-800' },
};
const BEER_DEFAULT = { fill: '#6b7280', bg: 'bg-gray-100', text: 'text-gray-600', icon: 'text-gray-400' };

const STATUS_PEDIDO_COLORS = {
  'Aberto': { fill: '#f59e0b', bg: 'bg-amber-100', text: 'text-amber-800' },
  'Entregue': { fill: '#3b82f6', bg: 'bg-blue-100', text: 'text-blue-800' },
  'Concluído': { fill: '#10b981', bg: 'bg-emerald-100', text: 'text-emerald-800' },
};

// ─── componentes de gráfico (sem libs externas) ────────────────────────────────

/** Donut SVG feito à mão: segmentos com stroke-dasharray + gap + legenda sempre visível. */
function DonutChart({ data, size = 148, thickness = 20, centerLabel, centerValue, emptyLabel = 'Sem dados' }) {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  const gap = total > 0 ? Math.min(6, circumference * 0.015) : 0;

  let acumulado = 0;
  const [hover, setHover] = useState(null);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={thickness} />
          {total > 0 && data.filter(d => d.value > 0).map((d, i) => {
            const frac = d.value / total;
            const dash = Math.max(frac * circumference - gap, 0);
            const offset = circumference - acumulado;
            acumulado += frac * circumference;
            const isHover = hover === i;
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color || BEER_DEFAULT.fill}
                strokeWidth={isHover ? thickness + 3 : thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                className="transition-all duration-150 cursor-pointer"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {total > 0 ? (
            <>
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">
                {hover !== null ? data[hover].label : centerLabel}
              </span>
              <span className="text-lg font-black text-accent leading-tight">
                {hover !== null ? data[hover].displayValue ?? data[hover].value : centerValue}
              </span>
            </>
          ) : (
            <span className="text-xs text-gray-400 text-center px-4">{emptyLabel}</span>
          )}
        </div>
      </div>

      <div className="flex-1 w-full space-y-2">
        {data.map((d, i) => {
          const pct = total > 0 ? (d.value / total) * 100 : 0;
          return (
            <div
              key={i}
              className={`flex items-center gap-2.5 rounded-lg px-1.5 py-1 -mx-1.5 transition-colors ${hover === i ? 'bg-gray-50' : ''}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color || BEER_DEFAULT.fill }} />
              <span className="text-sm font-medium text-gray-600 flex-1 truncate">{d.label}</span>
              <span className="text-sm font-bold text-accent">{d.displayValue ?? d.value}</span>
              <span className="text-xs text-gray-400 w-12 text-right shrink-0">{pct.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Barra horizontal simples de duas categorias (ex: Barril x PET, Pago x Pendente). */
function DuoBar({ a, b }) {
  const total = a.value + b.value;
  const pctA = total > 0 ? (a.value / total) * 100 : 50;
  const pctB = 100 - pctA;
  return (
    <div>
      <div className="flex h-3 w-full rounded-full overflow-hidden bg-gray-100">
        {total > 0 ? (
          <>
            <div style={{ width: `${pctA}%`, backgroundColor: a.color }} className="transition-all" />
            <div style={{ width: `${pctB}%`, backgroundColor: b.color }} className="transition-all" />
          </>
        ) : null}
      </div>
      <div className="flex justify-between mt-3 gap-3">
        {[a, b].map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <div>
              <p className="text-xs text-gray-400 leading-tight">{d.label}</p>
              <p className="text-sm font-bold text-accent leading-tight">{d.displayValue ?? d.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Ranking em lista com barra horizontal proporcional (top clientes, equipamentos). */
function RankingList({ items, valueColor = '#d97706', emptyLabel = 'Sem dados no período' }) {
  if (items.length === 0) {
    return <div className="py-10 text-center text-sm text-gray-400">{emptyLabel}</div>;
  }
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="group relative flex items-center gap-3">
          <span className="w-5 text-xs font-black text-gray-300 shrink-0 text-center">{idx + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline mb-1 gap-2">
              <span className="text-sm font-semibold text-accent truncate">{item.label}</span>
              <span className="text-sm font-bold text-gray-600 shrink-0">{item.displayValue}</span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(item.value / max) * 100}%`, backgroundColor: valueColor }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Gráfico de barras diário (faturamento por dia do mês) com tooltip on-hover por barra. */
function DailyBarChart({ dias, hojeDay }) {
  const [ativo, setAtivo] = useState(null);
  const max = Math.max(...dias.map(d => d.total), 1);
  const marcarLabel = (dia) => dia === 1 || dia === dias.length || dia % 5 === 0;

  return (
    <div>
      <div className="flex items-end gap-[3px] h-40">
        {dias.map((d) => {
          const pct = d.total > 0 ? Math.max((d.total / max) * 100, 3) : 1.5;
          const isHoje = d.dia === hojeDay;
          const isAtivo = ativo === d.dia;
          return (
            <div
              key={d.dia}
              className="group relative flex-1 flex flex-col items-center justify-end h-full cursor-pointer"
              onClick={() => setAtivo(prev => prev === d.dia ? null : d.dia)}
            >
              {/* Tooltip: hover no desktop, tap no mobile */}
              <div className={`absolute bottom-full mb-1.5 pointer-events-none transition-opacity z-10 whitespace-nowrap ${isAtivo ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <div className="bg-secondary text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg shadow-lg">
                  Dia {d.dia} · {fmtMoeda(d.total)}
                  {d.pedidos > 0 && <span className="text-gray-400"> · {d.pedidos} pedido{d.pedidos > 1 ? 's' : ''}</span>}
                </div>
              </div>
              <div
                className={`w-full rounded-t-[3px] transition-all ${d.total > 0 ? 'bg-amber-600 group-hover:bg-amber-500' : 'bg-gray-200'} ${isHoje ? 'ring-2 ring-primary ring-offset-1' : ''} ${isAtivo ? 'bg-amber-500' : ''}`}
                style={{ height: `${pct}%`, minHeight: 3 }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-[3px] mt-1.5">
        {dias.map((d) => (
          <div key={d.dia} className="flex-1 text-center">
            {marcarLabel(d.dia) && (
              <span className="text-[10px] text-gray-400 font-medium">{d.dia}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── card wrapper padrão ────────────────────────────────────────────────────────

function Card({ title, subtitle, icon: Icon, children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2.5">
        {Icon && <Icon size={17} className="text-primary shrink-0" />}
        <div>
          <h3 className="font-bold text-accent text-sm leading-tight">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function KpiCard({ icon: KpiIcon, iconColor, label, value, delta, deltaSuffix, sub }) {
  const deltaPositivo = delta > 0;
  const deltaNeutro = delta === 0 || delta === null || delta === undefined;
  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-3">
      <div className={`p-2.5 rounded-xl bg-gray-50 shrink-0 ${iconColor}`}>
        {KpiIcon && <KpiIcon size={20} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
        <h3 className="text-xl font-black text-accent leading-tight">{value}</h3>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        {delta !== undefined && delta !== null && (
          <p className={`text-xs font-bold mt-1 flex items-center gap-1 ${deltaNeutro ? 'text-gray-400' : deltaPositivo ? 'text-emerald-600' : 'text-red-500'}`}>
            {deltaNeutro ? <Minus size={12} /> : deltaPositivo ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {deltaNeutro ? 'estável' : `${deltaPositivo ? '+' : ''}${delta.toFixed(0)}%`} {deltaSuffix}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── página principal ──────────────────────────────────────────────────────────

export default function Relatorios() {
  const [pedidos, setPedidos] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refDate, setRefDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  useEffect(() => {
    const fetchTudo = async () => {
      try {
        const [pedidosSnap, eventosSnap, clientesSnap] = await Promise.all([
          getDocs(collection(db, 'pedidos')),
          getDocs(collection(db, 'eventos')),
          getDocs(collection(db, 'clientes')),
        ]);
        setPedidos(pedidosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setEventos(eventosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setClientes(clientesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Erro ao carregar relatórios:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTudo();
  }, []);

  const ano = refDate.getFullYear();
  const mes = refDate.getMonth();
  const hoje = new Date();
  const isMesAtual = ano === hoje.getFullYear() && mes === hoje.getMonth();

  const irParaMes = (delta) => setRefDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));

  const dados = useMemo(() => {
    const mesAnteriorRef = new Date(ano, mes - 1, 1);
    const clientesMap = new Map(clientes.map(c => [c.id, c]));

    const pertenceAoMes = (p, y, m) => {
      if (!p.dataIso) return false;
      const d = new Date(p.dataIso);
      return d.getFullYear() === y && d.getMonth() === m;
    };

    const pedidosMes = pedidos.filter(p => pertenceAoMes(p, ano, mes));
    const pedidosMesAnterior = pedidos.filter(p => pertenceAoMes(p, mesAnteriorRef.getFullYear(), mesAnteriorRef.getMonth()));

    const faturamentoMes = pedidosMes.reduce((acc, p) => acc + Number(p.valor || 0), 0);
    const faturamentoAnterior = pedidosMesAnterior.reduce((acc, p) => acc + Number(p.valor || 0), 0);
    const deltaFaturamento = faturamentoAnterior > 0
      ? ((faturamentoMes - faturamentoAnterior) / faturamentoAnterior) * 100
      : (faturamentoMes > 0 ? 100 : 0);

    const ticketMedio = pedidosMes.length > 0 ? faturamentoMes / pedidosMes.length : 0;
    const ticketMedioAnterior = pedidosMesAnterior.length > 0 ? faturamentoAnterior / pedidosMesAnterior.length : 0;
    const deltaTicket = ticketMedioAnterior > 0 ? ((ticketMedio - ticketMedioAnterior) / ticketMedioAnterior) * 100 : 0;

    const deltaPedidos = pedidosMesAnterior.length > 0
      ? ((pedidosMes.length - pedidosMesAnterior.length) / pedidosMesAnterior.length) * 100
      : (pedidosMes.length > 0 ? 100 : 0);

    // litros por tipo de cerveja
    const litrosPorTipo = {};
    let litrosTotal = 0;
    const litrosPorEmbalagem = { Barril: 0, PET: 0 };
    pedidosMes.forEach(p => {
      (p.itens || []).forEach(i => {
        const qtd = Number(i.quantidade || 0);
        litrosPorTipo[i.tipoCerveja] = (litrosPorTipo[i.tipoCerveja] || 0) + qtd;
        litrosTotal += qtd;
        if (i.embalagem === 'Barril' || i.embalagem === 'PET') {
          litrosPorEmbalagem[i.embalagem] += qtd;
        }
      });
    });

    // status dos pedidos
    const statusCount = { 'Aberto': 0, 'Entregue': 0, 'Concluído': 0 };
    pedidosMes.forEach(p => { statusCount[p.status || 'Aberto'] = (statusCount[p.status || 'Aberto'] || 0) + 1; });

    // pagamento
    const pagamentoCount = { Pago: 0, Pendente: 0 };
    pedidosMes.forEach(p => {
      const key = p.pagamento === 'Pago' ? 'Pago' : 'Pendente';
      pagamentoCount[key]++;
    });

    // tipo de pedido: entregar x retirar
    const tipoPedidoCount = { Entregar: 0, Retirar: 0 };
    pedidosMes.forEach(p => {
      const key = p.tipo === 'Retirar' ? 'Retirar' : 'Entregar';
      tipoPedidoCount[key]++;
    });

    // clientes atendidos no mês + cruzamento com coleção clientes (PF x PJ)
    const clientesAtendidosSet = new Set();
    const faturamentoPorCliente = new Map();
    let faturamentoPF = 0;
    let faturamentoPJ = 0;
    pedidosMes.forEach(p => {
      const chave = p.cliente_id || p.cliente || 'avulso';
      clientesAtendidosSet.add(chave);
      faturamentoPorCliente.set(chave, {
        nome: p.cliente || 'Pedido Avulso',
        valor: (faturamentoPorCliente.get(chave)?.valor || 0) + Number(p.valor || 0),
      });

      const clienteRef = p.cliente_id ? clientesMap.get(p.cliente_id) : null;
      if (clienteRef?.tipo === 'PJ') faturamentoPJ += Number(p.valor || 0);
      else faturamentoPF += Number(p.valor || 0);
    });

    const topClientes = [...faturamentoPorCliente.values()]
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 6)
      .map(c => ({ label: c.nome, value: c.valor, displayValue: fmtMoeda(c.valor) }));

    // equipamentos mais usados no mês
    const equipUso = new Map();
    pedidosMes.forEach(p => {
      (p.equipamentos || []).forEach(e => {
        const label = `${e.tipo === 'barril' ? 'Barril' : 'Chopeira'} ${e.tamanho || ''}`.trim();
        equipUso.set(label, (equipUso.get(label) || 0) + 1);
      });
    });
    const topEquipamentos = [...equipUso.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, count]) => ({ label, value: count, displayValue: `${count}x` }));

    // faturamento diário
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    const dias = Array.from({ length: diasNoMes }, (_, i) => ({ dia: i + 1, total: 0, pedidos: 0 }));
    pedidosMes.forEach(p => {
      const d = new Date(p.dataIso).getDate();
      if (dias[d - 1]) {
        dias[d - 1].total += Number(p.valor || 0);
        dias[d - 1].pedidos += 1;
      }
    });

    // eventos do mês
    const pad = (n) => String(n).padStart(2, '0');
    const prefixoMes = `${ano}-${pad(mes + 1)}`;
    const eventosMes = eventos.filter(e => (e.data || '').startsWith(prefixoMes));
    const eventosStatusCount = { confirmado: 0, pendente: 0, cancelado: 0 };
    eventosMes.forEach(e => { eventosStatusCount[e.status || 'pendente']++; });

    return {
      pedidosMes, faturamentoMes, deltaFaturamento, ticketMedio, deltaTicket, deltaPedidos,
      litrosPorTipo, litrosTotal, litrosPorEmbalagem, statusCount, pagamentoCount, tipoPedidoCount,
      clientesAtendidos: clientesAtendidosSet.size, faturamentoPF, faturamentoPJ,
      topClientes, topEquipamentos, dias, eventosMes, eventosStatusCount,
    };
  }, [pedidos, eventos, clientes, ano, mes]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const mesLabel = `${MESES[mes]} ${ano}`;
  const semDados = dados.pedidosMes.length === 0;

  return (
    <div className="space-y-6 pb-20">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-accent flex items-center gap-2">
            <ChartArea className="text-primary" size={26} /> Relatórios
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Desempenho mensal do negócio</p>
        </div>

        {/* Navegador de mês */}
        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 shadow-sm p-1.5 self-start sm:self-auto">
          <button
            onClick={() => irParaMes(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 active:scale-90 transition-all cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="font-bold text-accent text-sm w-36 text-center capitalize select-none">{mesLabel}</span>
          <button
            onClick={() => irParaMes(1)}
            disabled={isMesAtual}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {semDados && (
        <div className="p-10 text-center text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300">
          <ChartArea size={36} className="mx-auto mb-3 text-gray-300" />
          Nenhum pedido registrado em {mesLabel}.
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Wallet} iconColor="text-emerald-500"
          label="Faturamento do mês" value={fmtMoedaCompacta(dados.faturamentoMes)}
          delta={dados.deltaFaturamento} deltaSuffix="vs mês anterior"
        />
        <KpiCard
          icon={ClipboardList} iconColor="text-blue-500"
          label="Pedidos no mês" value={dados.pedidosMes.length}
          sub={`Ticket médio: ${fmtMoeda(dados.ticketMedio)}`}
          delta={dados.deltaPedidos} deltaSuffix="vs mês anterior"
        />
        <KpiCard
          icon={Droplets} iconColor="text-amber-500"
          label="Litros vendidos" value={`${dados.litrosTotal.toFixed(0)} L`}
        />
        <KpiCard
          icon={Users} iconColor="text-purple-500"
          label="Clientes atendidos" value={dados.clientesAtendidos}
        />
      </div>

      {/* ── Faturamento diário ── */}
      <Card title="Faturamento diário" subtitle={`Receita por dia em ${mesLabel}`} icon={TrendingUp}>
        {dados.dias.some(d => d.total > 0) ? (
          <DailyBarChart dias={dados.dias} hojeDay={isMesAtual ? hoje.getDate() : null} />
        ) : (
          <p className="text-sm text-gray-400 text-center py-10">Sem vendas registradas neste mês.</p>
        )}
      </Card>

      {/* ── Cerveja + Embalagem ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Cerveja vendida por tipo" subtitle="Volume em litros" icon={Beer}>
          <DonutChart
            centerLabel="Total" centerValue={`${dados.litrosTotal.toFixed(0)} L`}
            data={Object.entries(dados.litrosPorTipo).sort((a, b) => b[1] - a[1]).map(([tipo, litros]) => ({
              label: tipo,
              value: litros,
              displayValue: `${litros.toFixed(0)} L`,
              color: (BEER_COLORS[tipo] || BEER_DEFAULT).fill,
            }))}
          />
        </Card>

        <Card title="Embalagem utilizada" subtitle="Barril x PET, em litros" icon={Barrel}>
          <DuoBar
            a={{ label: 'Barril', value: dados.litrosPorEmbalagem.Barril, displayValue: `${dados.litrosPorEmbalagem.Barril.toFixed(0)} L`, color: '#d97706' }}
            b={{ label: 'PET', value: dados.litrosPorEmbalagem.PET, displayValue: `${dados.litrosPorEmbalagem.PET.toFixed(0)} L`, color: '#0ea5e9' }}
          />

          <div className="h-px bg-gray-100 my-5" />

          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Entrega x Retirada</p>
          <DuoBar
            a={{ label: 'Entregar', value: dados.tipoPedidoCount.Entregar, displayValue: dados.tipoPedidoCount.Entregar, color: '#60a5fa' }}
            b={{ label: 'Retirar', value: dados.tipoPedidoCount.Retirar, displayValue: dados.tipoPedidoCount.Retirar, color: '#34d399' }}
          />
        </Card>
      </div>

      {/* ── Status + Pagamento ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Status dos pedidos" subtitle="Distribuição no mês" icon={Receipt}>
          <DonutChart
            centerLabel="Pedidos" centerValue={dados.pedidosMes.length}
            data={Object.entries(dados.statusCount).map(([status, count]) => ({
              label: status, value: count, color: STATUS_PEDIDO_COLORS[status]?.fill,
            }))}
          />
        </Card>

        <Card title="Pagamentos e clientes" subtitle="Situação financeira do mês" icon={Wallet}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Pago x Pendente</p>
          <DuoBar
            a={{ label: 'Pago', value: dados.pagamentoCount.Pago, displayValue: dados.pagamentoCount.Pago, color: '#10b981' }}
            b={{ label: 'Pendente', value: dados.pagamentoCount.Pendente, displayValue: dados.pagamentoCount.Pendente, color: '#ef4444' }}
          />

          <div className="h-px bg-gray-100 my-5" />

          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Faturamento por tipo de cliente</p>
          <DuoBar
            a={{ label: 'Pessoa Física', value: dados.faturamentoPF, displayValue: fmtMoeda(dados.faturamentoPF), color: '#9ca3af' }}
            b={{ label: 'Empresas (PJ)', value: dados.faturamentoPJ, displayValue: fmtMoeda(dados.faturamentoPJ), color: '#3b82f6' }}
          />
        </Card>
      </div>

      {/* ── Rankings ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Top clientes do mês" subtitle="Por faturamento" icon={Trophy}>
          <RankingList items={dados.topClientes} valueColor="#d97706" />
        </Card>

        <Card title="Equipamentos mais usados" subtitle="Barris e chopeiras vinculados" icon={Boxes}>
          <RankingList items={dados.topEquipamentos} valueColor="#d97706" emptyLabel="Nenhum equipamento vinculado neste período" />
        </Card>
      </div>

      {/* ── Eventos do mês ── */}
      <Card title="Eventos do mês" subtitle={`Feiras e participações em ${mesLabel}`} icon={CalendarDays}>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { key: 'confirmado', label: 'Confirmados', icon: CheckCircle2, bg: 'bg-emerald-50', text: 'text-emerald-700' },
            { key: 'pendente', label: 'Pendentes', icon: AlertCircle, bg: 'bg-amber-50', text: 'text-amber-700' },
            { key: 'cancelado', label: 'Cancelados', icon: XCircle, bg: 'bg-red-50', text: 'text-red-600' },
          ].map(s => (
            <div key={s.key} className={`rounded-xl p-3 text-center ${s.bg}`}>
              <s.icon size={16} className={`mx-auto mb-1 ${s.text}`} />
              <p className={`text-xl font-black ${s.text}`}>{dados.eventosStatusCount[s.key]}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {dados.eventosMes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhum evento cadastrado neste mês.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {dados.eventosMes.map(e => (
              <div key={e.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-accent truncate">{e.nome}</p>
                  <p className="text-xs text-gray-400">{e.data?.split('-').reverse().join('/')}{e.local ? ` · ${e.local}` : ''}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                  e.status === 'confirmado' ? 'bg-emerald-100 text-emerald-700'
                  : e.status === 'cancelado' ? 'bg-red-100 text-red-600'
                  : 'bg-amber-100 text-amber-700'
                }`}>
                  {e.status === 'confirmado' ? 'Confirmado' : e.status === 'cancelado' ? 'Cancelado' : 'Pendente'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
