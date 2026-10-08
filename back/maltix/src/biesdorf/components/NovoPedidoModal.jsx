import { useState, useEffect } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import SuccessMessage from '../components/SuccessToast';

export default function NovoPedidoModal({ isOpen, onClose, onPedidoSalvo, pedidoEditando }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form states
  const [cliente, setCliente] = useState('');
  const [clientes, setClientes] = useState([]);
  const [resultadoClientes, setResultadoClientes] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [dataEntrega, setDataEntrega] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState('Entregar');
  const [endereco, setEndereco] = useState('');
  const [pagamento, setPagamento] = useState('Pendente');

  // Item form states
  const [tipoCerveja, setTipoCerveja] = useState('Pilsen');
  const [embalagem, setEmbalagem] = useState('Barril');
  const [quantidade, setQuantidade] = useState('10');
  const [valorUn, setValorUn] = useState(' ');

  // Cart
  const [itens, setItens] = useState([]);
  const [frete, setFrete] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const resetForm = () => {
    setCliente('');
    setDataEntrega('');
    setEndereco('');
    setItens([]);
    setStep(1);
    setClienteSelecionado(null);
    setFrete('');
  };

  useEffect(() => {
  if (!isOpen) {
    setClienteSelecionado(null);
  }
}, [isOpen]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const precoPorTipo = { Pilsen: '12', Viena: '14', IPA: '14' };

  useEffect(() => {
    setValorUn(precoPorTipo[tipoCerveja] || '');
  }, [tipoCerveja]);

  const fetchClientes = async () => {
  try {
    const snapshot = await getDocs(collection(db, "clientes"));
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setClientes(data);
  } catch (err) {
    console.error(err);
  }
};

  useEffect(() => {
    if (isOpen) fetchClientes();
  }, [isOpen]);

  useEffect(() => {
    if (pedidoEditando && isOpen) {
      setCliente(pedidoEditando.cliente || '');
      setClienteSelecionado(
        pedidoEditando.cliente_id
          ? {
              id: pedidoEditando.cliente_id,
              telefone: pedidoEditando.telefone,
              endereco: pedidoEditando.endereco
            }
          : null
      );
      setEndereco(pedidoEditando.endereco || '');
      setTipoEntrega(pedidoEditando.tipo || 'Entregar');
      setPagamento(pedidoEditando.pagamento || 'Pendente');
      setItens(pedidoEditando.itens || []);
      setFrete(pedidoEditando.frete || '');
      if (pedidoEditando.dataIso) {
        const d = new Date(pedidoEditando.dataIso);
        const offset = d.getTimezoneOffset() * 60000;
        const local = new Date(d.getTime() - offset);
        setDataEntrega(local.toISOString().slice(0, 16));
      } else {
        setDataEntrega('');
      }
    }
  }, [pedidoEditando, isOpen]);

  const handleBuscaCliente = (valor) => {
  setCliente(valor);
  setClienteSelecionado(null);

  if (!valor) {
    setResultadoClientes([]);
    return;
  }

  const filtrados = clientes.filter(c =>
    c.nome?.toLowerCase().includes(valor.toLowerCase()) ||
    c.telefone?.includes(valor)
  );

  setResultadoClientes(filtrados.slice(0, 5)); // limite
};

  const handleAddItem = () => {
    if (!quantidade || !valorUn || Number(quantidade) <= 0 || Number(valorUn) <= 0) {
      alert("Por favor, preencha quantidade e valor unitário corretamente.");
      return;
    }
    const novoItem = {
      tipoCerveja,
      embalagem,
      quantidade: Number(quantidade),
      valorUn: Number(valorUn)
    };
    setItens([...itens, novoItem]);
    setValorUn(precoPorTipo[tipoCerveja] || ''); // ← troca aqui
  };

  const handleRemoverItem = (index) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const calcularTotal = () => {
    return itens.reduce((acc, item) => acc + (item.quantidade * item.valorUn), 0);
  };

  const handleFinalizar = async () => {
    if (itens.length === 0) {
      alert("Adicione pelo menos um item ao pedido.");
      return;
    }

    setLoading(true);

    const dataObj = dataEntrega ? new Date(dataEntrega) : new Date();

    const dataFormatada = dataObj.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const totalItens = calcularTotal();
    const valorFrete = Number(frete) || 0;
    const totalFinal = totalItens + valorFrete;

    const novoPedido = {
      cliente: cliente || 'Pedido Avulso',
      cliente_id: clienteSelecionado?.id || null,
      telefone: clienteSelecionado?.telefone || null,
      data: dataFormatada,
      dataIso: dataObj.toISOString(),      tipo: tipoEntrega,
      endereco: endereco,
      valor: totalFinal.toFixed(2),
      frete: valorFrete,
      status: 'Aberto',
      pagamento: pagamento,
      itens: [...itens],
      createdAt: pedidoEditando?.createdAt || new Date().toISOString()
    };

    try {

      if (pedidoEditando) {
        await updateDoc(doc(db, 'pedidos', pedidoEditando.id), {
          ...novoPedido,
          createdAt: pedidoEditando.createdAt // mantém original
        });
      } else {
        await addDoc(collection(db, 'pedidos'), novoPedido);
      }

      if (onPedidoSalvo) onPedidoSalvo();

      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        handleClose();
      }, 500);

    } catch (error) {
      console.error(error);
      alert('Erro ao salvar o pedido');
    } finally {
      setLoading(false);
    }
  };

  const renderWizardStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h3 className="text-lg font-bold text-accent">1. Cliente e Data</h3>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Nome do Cliente</label>
              <input
                type="text"
                value={cliente}
                onChange={e => handleBuscaCliente(e.target.value)}
                placeholder="Nome ou evento"
                className="w-full border border-gray-300 rounded-lg p-3 bg-white focus:ring-1 focus:ring-primary outline-none transition-shadow"
              />
{resultadoClientes.length > 0 && (
  <ul className="bg-white border rounded-lg mt-1 max-h-40 overflow-y-auto shadow">

    {/* OPÇÃO DE NÃO VINCULAR */}
    <li
      onClick={() => {
        setClienteSelecionado(null);
        setResultadoClientes([]);
      }}
      className="p-2 bg-gray-50 hover:bg-gray-100 cursor-pointer text-sm border-b"
    >
      ➕ Usar "{cliente}" sem vincular
    </li>

    {resultadoClientes.map(c => (
      <li
        key={c.id}
        onClick={() => {
          setCliente(c.nome);
          setClienteSelecionado(c);
          setResultadoClientes([]);

          if (c.endereco) setEndereco(c.endereco);
        }}
        className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
      >
        <div className="font-medium">{c.nome}</div>
        <div className="text-xs text-gray-400">{c.telefone}</div>
      </li>
    ))}
  </ul>
)}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Data da Entrega</label>
              <input
                type="datetime-local"
                value={dataEntrega}
                onChange={e => setDataEntrega(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 bg-white focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <button
              onClick={() => {
                if (!dataEntrega) alert('Preencha a data!');
                else setStep(2);
              }}
              className="w-full bg-primary hover:bg-primary-hover text-secondary font-bold py-3 rounded-lg mt-6 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
            >
              Avançar
            </button>
          </motion.div>
        );
      case 2:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h3 className="text-lg font-bold text-accent">2. Adicionar Bebidas</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Tipo</label>
                <select value={tipoCerveja} onChange={e => setTipoCerveja(e.target.value)} className="w-full border border-gray-300 p-3 rounded-lg bg-white focus:ring-1 focus:ring-primary outline-none cursor-pointer">
                  <option>Pilsen</option>
                  <option>Viena</option>
                  <option>IPA</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Embalagem</label>
                <select
                  value={embalagem}
                  onChange={e => {
                    setEmbalagem(e.target.value);
                    if (e.target.value === 'Barril') setQuantidade('10');
                    else setQuantidade('');
                  }}
                  className="w-full border border-gray-300 p-3 rounded-lg bg-white focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                >
                  <option>Barril</option>
                  <option>PET</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Qtd (Litros)</label>
                {embalagem === 'Barril' ? (
                  <select value={quantidade} onChange={e => setQuantidade(e.target.value)} className="w-full border border-gray-300 p-3 rounded-lg bg-white focus:ring-1 focus:ring-primary outline-none cursor-pointer">
                    <option value="10">10 L</option>
                    <option value="15">15 L</option>
                    <option value="20">20 L</option>
                    <option value="30">30 L</option>
                    <option value="50">50 L</option>
                  </select>
                ) : (
                  <input type="number" min="1" value={quantidade} onChange={e => setQuantidade(e.target.value)} placeholder="Litros..." className="w-full border border-gray-300 p-3 rounded-lg bg-white focus:ring-1 focus:ring-primary outline-none" />
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Preço p/ Litro</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">R$</span>
                  <input type="number" step="0.01" min="0" value={valorUn} onChange={e => setValorUn(e.target.value)} placeholder="0.00" className="w-full border border-gray-300 p-3 pl-9 rounded-lg bg-white focus:ring-1 focus:ring-primary outline-none" />
                </div>
              </div>
            </div>

            <button onClick={handleAddItem} className="w-full border border-primary bg-primary/10 text-secondary py-3 rounded-lg font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform hover:bg-primary hover:text-white cursor-pointer mt-2">
              <Plus size={18} /> Adicionar ao Carrinho
            </button>

            {/* Carrinho Simulado */}
            <div className="bg-gray-50 p-4 rounded-xl mt-4 text-sm space-y-3 min-h-[100px] border border-gray-100">
              {itens.length === 0 ? (
                <p className="text-center text-gray-400 pt-3">Carrinho vazio.</p>
              ) : (
                <>
                  {itens.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center border-b border-gray-200 pb-2">
                      <div>
                        <span className="font-semibold text-accent">{item.tipoCerveja} {item.quantidade}L</span>
                        <span className="text-gray-400 text-xs ml-2">({item.embalagem})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-600">R$ {(item.valorUn * item.quantidade).toFixed(2)}</span>
                        <button onClick={() => handleRemoverItem(idx)} className="text-red-400 hover:text-red-600 p-1 active:scale-90"><X size={16} /></button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between font-black pt-1 text-base text-accent">
                    <span>TOTAL</span>
                    <span className="text-primary">R$ {calcularTotal().toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(1)} className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-lg active:scale-95 transition-transform hover:bg-gray-50 cursor-pointer">Voltar</button>
              <button onClick={() => {
                if (itens.length > 0) setStep(3);
                else alert('Adicione algo no carrinho primeiro!');
              }} className="flex-[2] bg-primary hover:bg-primary-hover text-secondary font-bold py-3 rounded-lg active:scale-95 transition-transform shadow-sm cursor-pointer">Avançar</button>
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <h3 className="text-lg font-bold text-accent">3. Logística</h3>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Ação do Pedido</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTipoEntrega('Entregar')}
                  className={`flex-1 py-3 rounded-lg font-medium transition-all cursor-pointer ${tipoEntrega === 'Entregar' ? 'bg-blue-100 text-blue-800 border-2 border-blue-300 shadow-inner' : 'bg-white border border-gray-200 text-gray-500'}`}
                >Entregar</button>
                <button
                  onClick={() => {
                    setTipoEntrega('Retirar');
                    setFrete('');
                  }}
                  className={`flex-1 py-3 rounded-lg font-medium transition-all cursor-pointer ${tipoEntrega === 'Retirar' ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300 shadow-inner' : 'bg-white border border-gray-200 text-gray-500'}`}
                >Cliente retira</button>
              </div>
            </div>

            {tipoEntrega === 'Entregar' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <label className="block text-sm font-medium text-gray-600 mb-1 mt-4">Endereço de Entrega</label>
                <input type="text" value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Rua, Número..." className="w-full border border-gray-300 rounded-lg p-3 bg-white focus:ring-1 focus:ring-primary outline-none" />
                <div className="mt-3">
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Valor do Frete
                </label>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    R$
                  </span>

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={frete}
                    onChange={e => setFrete(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-300 p-3 pl-9 rounded-lg bg-white focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>
              </motion.div>
            )}

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">Status de Pagamento</label>
              <select value={pagamento} onChange={e => setPagamento(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 bg-white focus:ring-1 focus:ring-primary outline-none cursor-pointer">
                <option value="Pendente">Pendente</option>
                <option value="Pago">Pago</option>
              </select>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setStep(2)} className="flex-1 bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-lg active:scale-95 transition-transform hover:bg-gray-50 cursor-pointer">Voltar</button>
              <button onClick={handleFinalizar} disabled={loading} className="flex-[2] bg-secondary text-white font-bold py-3 rounded-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-xl hover:bg-black cursor-pointer disabled:opacity-50">
                <Check size={20} className="text-primary" /> {loading ? 'Salvando...' : 'Finalizar'}
              </button>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.5 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[550px] bg-background md:rounded-2xl rounded-t-3xl z-50 p-6 pt-2 shadow-2xl h-[90vh] md:h-auto md:max-h-[90vh] flex flex-col"
          >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto my-3 md:hidden"></div>

            <div className="flex justify-between items-center mb-6 mt-2 md:mt-4 border-b border-gray-200 pb-4">
              <h2 className="text-xl font-bold text-accent">
                {pedidoEditando ? 'Editar Pedido' : 'Novo Pedido'}
              </h2>
              <button onClick={handleClose} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors active:scale-90 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Steps Indicator */}
            <div className="flex gap-2 mb-6">
              {[1, 2, 3].map(i => (
                <div key={i} className={`h-2 flex-1 rounded-full transition-colors duration-300 ${step >= i ? 'bg-primary' : 'bg-gray-200'}`}></div>
              ))}
            </div>

            {/* Wizard Content Scrollable Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden pb-4 px-1 custom-scrollbar">
              {renderWizardStep()}
            </div>
          </motion.div>
        </>
      )}
      <SuccessMessage
        show={showSuccess}
        message={pedidoEditando ? "Pedido atualizado com sucesso" : "Pedido cadastrado com sucesso"}
      />
    </AnimatePresence>
  );
}
