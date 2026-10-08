export type TankStatus = 'Livre' | 'Em Fermentação' | 'Em Maturação' | 'Pronto p/ Envase' | 'Higienização/CIP';
export type BatchStatus = 'Em Produção' | 'Concluído' | 'Cancelado';
export type OrderStatus = 'Rascunho' | 'Confirmado' | 'Em Envase/Separação' | 'Pronto p/ Envio' | 'Entregue';

export interface Tank {
  id: string;
  nome: string;
  tipo: 'Fermentador' | 'Maturador' | 'BBT';
  capacidadeLitros: number;
  status: TankStatus;
  loteAtualId?: string;
}

export interface Batch {
  id: string;
  codigo: string;
  estilo: string;
  dataBrassagem: string;
  volumeLitros: number;
  tanqueId: string;
  status: BatchStatus;
  diaAtual: number;
  diasPlanejados: number;
}

export interface Measurement {
  id: string;
  loteId: string;
  dataHora: string;
  temperatura: number;
  densidade: number;
  pressao: number;
  ph: number;
  observacao: string;
}

export interface Customer {
  id: string;
  nomeEmpresa: string;
  contato: string;
  cidade: string;
  documento: string;
}

export interface OrderItem {
  estilo: string;
  formato: string;
  quantidade: number;
  valorUnitario: number;
}

export interface Order {
  id: string;
  clienteId: string;
  dataPedido: string;
  dataEntrega: string;
  status: OrderStatus;
  itens: OrderItem[];
  valorTotal: number;
}
