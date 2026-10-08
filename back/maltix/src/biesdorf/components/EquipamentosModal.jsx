import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { X, Barrel, Beer, Plus, Trash2, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

// ─── helpers ──────────────────────────────────────────────────────────────────

const pad = (n) => String(n).padStart(2, '0');

// ─── sub-component: seletor de um equipamento ─────────────────────────────────

function EquipamentoSelector({ tipo, disponiveis, selecionados, onAdd, onRemove }) {
  const [inputVal, setInputVal] = useState('');
  const [erro, setErro] = useState('');

  const Icon = tipo === 'barril' ? Barrel : Beer;
  const label = tipo === 'barril' ? 'Barril' : 'Chopeira';
  const cor = tipo === 'barril' ? 'amber' : 'blue';

  const handleAdd = (codigo) => {
    const codigoFormatado = pad(parseInt(codigo, 10));

    if (!codigo || isNaN(parseInt(codigo, 10))) {
      setErro('Digite um número válido (01–99)');
      return;
    }
    const num = parseInt(codigo, 10);
    if (num < 1 || num > 99) {
      setErro('Código deve ser entre 01 e 99');
      return;
    }
    if (selecionados.includes(codigoFormatado)) {
      setErro(`${label} ${codigoFormatado} já está adicionado`);
      return;
    }

    // Verifica se está disponível (não está em uso por outro pedido)
    const equipDisponivel = disponiveis.find(
      (e) => e.tipo === tipo && e.codigo === codigoFormatado
    );

    if (equipDisponivel && equipDisponivel.status === 'em_uso') {
      setErro(`${label} ${codigoFormatado} já está em uso`);
      return;
    }

    setErro('');
    setInputVal('');
    onAdd(codigoFormatado);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd(inputVal);
  };

  return (
    <div className="space-y-3">
      {/* Header do tipo */}
      <div className={`flex items-center gap-2 text-${cor}-700 font-bold text-sm uppercase tracking-wide`}>
        <Icon size={16} />
        <span>
        {tipo === 'barril' ? 'Barris vinculados' : 'Chopeiras vinculadas'}
        </span>
        </div>

      {/* Chips dos selecionados */}
      <div className="flex flex-wrap gap-2 min-h-[36px]">
        {selecionados.length === 0 ? (
          <span className="text-gray-400 text-sm italic">Nenhum {label.toLowerCase()} vinculado</span>
        ) : (
          selecionados.map((cod) => {
            const eq = disponiveis.find(d => d.tipo === tipo && d.codigo === cod);
            const tamanhoStr = eq && eq.tamanho ? ` - ${eq.tamanho}` : '';
            return (
            <span
              key={cod}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-${cor}-100 text-${cor}-800 border border-${cor}-200`}
            >
              <Icon size={13} />
              {label} {cod}{tamanhoStr}
              <button
                onClick={() => onRemove(cod)}
                className={`ml-1 hover:text-red-600 transition-colors`}
                title={`Remover ${label} ${cod}`}
              >
                <X size={13} />
              </button>
            </span>
          )})
        )}
      </div>

      {/* Input + botão de adicionar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="number"
            min="1"
            max="99"
            value={inputVal}
            onChange={(e) => { setInputVal(e.target.value); setErro(''); }}
            onKeyDown={handleKeyDown}
            placeholder={`Código ${label} (01–99)`}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <button
          onClick={() => handleAdd(inputVal)}
          className={`px-3 py-2 bg-${cor}-100 text-${cor}-700 rounded-lg hover:bg-${cor}-200 transition-colors font-semibold text-sm flex items-center gap-1`}
        >
          <Plus size={15} /> Adicionar
        </button>
      </div>

      {/* Erro */}
      {erro && (
        <p className="text-red-500 text-xs flex items-center gap-1">
          <AlertCircle size={13} /> {erro}
        </p>
      )}

      {/* Lista de disponíveis clicáveis */}
      {disponiveis.filter((e) => e.tipo === tipo && e.status === 'estoque').length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-1.5 font-medium">Disponíveis em estoque — clique para adicionar:</p>
          <div className="flex flex-wrap gap-1.5">
            {disponiveis
              .filter((e) => e.tipo === tipo && e.status === 'estoque')
              .sort((a, b) => a.codigo.localeCompare(b.codigo))
              .map((e) => {
                const jaAdicionado = selecionados.includes(e.codigo);
                return (
                  <button
                    key={e.codigo}
                    onClick={() => !jaAdicionado && onAdd(e.codigo)}
                    disabled={jaAdicionado}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      jaAdicionado
                        ? `bg-${cor}-100 text-${cor}-400 border-${cor}-200 cursor-default`
                        : `bg-white text-gray-600 border-gray-200 hover:bg-${cor}-50 hover:border-${cor}-300 hover:text-${cor}-700 cursor-pointer active:scale-95`
                    }`}
                  >
                    {jaAdicionado ? '✓ ' : ''}{pad(parseInt(e.codigo))} {e.tamanho ? `- ${e.tamanho}` : ''}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modal principal ───────────────────────────────────────────────────────────

export default function EquipamentosModal({ isOpen, onClose, pedido, onSalvo }) {
  const [disponiveis, setDisponiveis] = useState([]);
  const [loadingEquip, setLoadingEquip] = useState(true);

  // Codigos já vinculados neste pedido (separados por tipo)
  const [barriesSel, setBarrisSel] = useState([]);
  const [chopeirasSel, setChopeirasSel] = useState([]);

  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  // ── carrega equipamentos ao abrir ──────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !pedido) return;

    setSucesso(false);

    // Pré-preenche com o que já está vinculado no pedido
    const equipsAtual = pedido.equipamentos || [];
    setBarrisSel(equipsAtual.filter((e) => e.tipo === 'barril').map((e) => e.codigo));
    setChopeirasSel(equipsAtual.filter((e) => e.tipo === 'chopeira').map((e) => e.codigo));

    const fetchEquipamentos = async () => {
      setLoadingEquip(true);
      try {
        const snap = await getDocs(collection(db, 'equipamentos'));
        const todos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Filtra: mostra equipamentos em estoque OU os já vinculados neste pedido
        const equipsDestePedido = (pedido.equipamentos || []).map((e) => e.codigo + e.tipo);
        const filtrados = todos.filter(
          (e) =>
            e.status === 'estoque' ||
            e.pedidoId === pedido.id ||
            equipsDestePedido.includes(e.codigo + e.tipo)
        );

        setDisponiveis(filtrados);
      } catch (err) {
        console.error('Erro ao carregar equipamentos:', err);
      } finally {
        setLoadingEquip(false);
      }
    };

    fetchEquipamentos();
  }, [isOpen, pedido]);

  if (!isOpen || !pedido) return null;

  // ── handlers ──────────────────────────────────────────────────────────────

  const handleAddBarril = (cod) => setBarrisSel((prev) => [...prev, cod]);
  const handleRemoveBarril = (cod) => setBarrisSel((prev) => prev.filter((c) => c !== cod));
  const handleAddChopeira = (cod) => setChopeirasSel((prev) => [...prev, cod]);
  const handleRemoveChopeira = (cod) => setChopeirasSel((prev) => prev.filter((c) => c !== cod));

  // ── salvar ─────────────────────────────────────────────────────────────────

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const batch = writeBatch(db);

      // 1. Monta lista nova de equipamentos vinculados
      const novosEquipamentos = [
        ...barriesSel.map((cod) => {
          const eq = disponiveis.find(d => d.tipo === 'barril' && d.codigo === cod);
          return { tipo: 'barril', codigo: cod, tamanho: eq?.tamanho || '' };
        }),
        ...chopeirasSel.map((cod) => {
          const eq = disponiveis.find(d => d.tipo === 'chopeira' && d.codigo === cod);
          return { tipo: 'chopeira', codigo: cod, tamanho: eq?.tamanho || '' };
        }),
      ];

      // 2. Equipamentos antigos vinculados a este pedido (para liberar os removidos)
      const equipsAntigos = pedido.equipamentos || [];

      // Determina quais foram REMOVIDOS nesta edição
      const removidos = equipsAntigos.filter(
        (old) =>
          !novosEquipamentos.some(
            (nov) => nov.tipo === old.tipo && nov.codigo === old.codigo
          )
      );

      // Determina quais são NOVOS (adicionados agora)
      const adicionados = novosEquipamentos.filter(
        (nov) =>
          !equipsAntigos.some(
            (old) => old.tipo === nov.tipo && old.codigo === nov.codigo
          )
      );

      // 3. Busca os docs de equipamentos para atualizar status
      const snapAll = await getDocs(collection(db, 'equipamentos'));
      const todosEquips = snapAll.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Libera os removidos
      for (const rem of removidos) {
        const equip = todosEquips.find(
          (e) => e.tipo === rem.tipo && e.codigo === rem.codigo
        );
        if (equip) {
          batch.update(doc(db, 'equipamentos', equip.id), {
            status: 'estoque',
            pedidoId: null,
          });
        }
      }

      // Marca os adicionados como em uso — verifica conflito antes
      for (const add of adicionados) {
        const equip = todosEquips.find(
          (e) => e.tipo === add.tipo && e.codigo === add.codigo
        );
        if (equip) {
          if (equip.status === 'em_uso' && equip.pedidoId !== pedido.id) {
            alert(
              `${add.tipo === 'barril' ? 'Barril' : 'Chopeira'} ${add.codigo} foi marcado como em uso por outro pedido. Operação cancelada.`
            );
            setSalvando(false);
            return;
          }
          batch.update(doc(db, 'equipamentos', equip.id), {
            status: 'em_uso',
            pedidoId: pedido.id,
          });
        }
        // Se o equipamento não existe na coleção (foi digitado manualmente),
        // apenas salva no pedido sem atualizar equipamentos
      }

      // 4. Atualiza o pedido com a lista de equipamentos
      batch.update(doc(db, 'pedidos', pedido.id), {
        equipamentos: novosEquipamentos,
      });

      await batch.commit();

      setSucesso(true);
      setTimeout(() => {
        onSalvo && onSalvo();
        onClose();
        setSucesso(false);
      }, 1000);
    } catch (err) {
      console.error('Erro ao salvar equipamentos:', err);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-black text-gray-800">Equipamentos</h2>
            <p className="text-sm text-gray-500 font-medium">{pedido.cliente}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {loadingEquip ? (
            <div className="flex justify-center py-8">
              <Loader2 size={28} className="animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* Barrís */}
              <EquipamentoSelector
                tipo="barril"
                disponiveis={disponiveis}
                selecionados={barriesSel}
                onAdd={handleAddBarril}
                onRemove={handleRemoveBarril}
              />

              <div className="border-t border-gray-100" />

              {/* Chopeiras */}
              <EquipamentoSelector
                tipo="chopeira"
                disponiveis={disponiveis}
                selecionados={chopeirasSel}
                onAdd={handleAddChopeira}
                onRemove={handleRemoveChopeira}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando || sucesso}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-secondary font-bold text-sm transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {sucesso ? (
              <><CheckCircle2 size={16} /> Salvo!</>
            ) : salvando ? (
              <><Loader2 size={16} className="animate-spin" /> Salvando...</>
            ) : (
              'Salvar Vínculos'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}