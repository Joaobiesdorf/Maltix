import { useState, useEffect } from 'react';
import { Beer, Search, Plus, Calendar } from 'lucide-react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function Cervejas() {
  const [estoque, setEstoque] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEstoque = async () => {
      try {
        const q = query(collection(db, "cervejas"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEstoque(data);
      } catch (err) {
        console.error("Erro ao buscar estoque:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEstoque();
  }, []);

  if (loading) {
     return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Beer className="text-primary" /> Estoque Cervejas
        </h1>
        <button
          onClick={() => alert("Módulo Cerveja Cloud em construção")}
          className="bg-primary hover:bg-primary-hover text-secondary px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
        >
          <Plus size={20} /> <span className="hidden sm:inline">Add Produção</span>
        </button>
      </div>

      {estoque.length === 0 && (
         <div className="p-10 text-center text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300">
           Nenhum lote de cerveja registrado.
         </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {estoque.map(item => (
          <div key={item.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
            {/* Tag Lote */}
            <div className="absolute top-0 right-0 bg-gray-100 px-3 py-1 text-xs font-bold text-gray-500 rounded-bl-lg border-b border-l border-gray-200">
              {item.lote || 'L-000'}
            </div>

            <h3 className="font-bold text-xl text-accent mb-1">{item.tipo || 'Cerveja Especial'}</h3>
            <p className="text-sm text-gray-500 flex items-center gap-1 mb-4"><Calendar size={14} /> Prod: {item.dataStr || 'S/D'}</p>

            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Volume (L)</p>
                <p className="text-2xl font-black text-secondary">{item.totalLitros || 0} L</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Valor p/ Litro</p>
                <p className="text-lg font-bold text-primary">R$ {item.valorL || '0,00'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
