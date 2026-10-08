import type { Batch, Customer, Measurement, Order, Tank } from './types';

export const initialTanks: Tank[] = [
  { id: 'tank-1', nome: 'F-01', tipo: 'Fermentador', capacidadeLitros: 1000, status: 'Em Fermentação', loteAtualId: 'batch-1' },
  { id: 'tank-2', nome: 'F-02', tipo: 'Fermentador', capacidadeLitros: 2000, status: 'Em Fermentação', loteAtualId: 'batch-2' },
  { id: 'tank-3', nome: 'F-03', tipo: 'Fermentador', capacidadeLitros: 1000, status: 'Livre' },
  { id: 'tank-4', nome: 'M-01', tipo: 'Maturador', capacidadeLitros: 1000, status: 'Em Maturação', loteAtualId: 'batch-3' },
  { id: 'tank-5', nome: 'M-02', tipo: 'Maturador', capacidadeLitros: 2000, status: 'Higienização/CIP' },
  { id: 'tank-6', nome: 'BBT-01', tipo: 'BBT', capacidadeLitros: 1000, status: 'Pronto p/ Envase', loteAtualId: 'batch-4' },
];

export const initialBatches: Batch[] = [
  { id: 'batch-1', codigo: 'L2026-084', estilo: 'West Coast IPA', dataBrassagem: '2026-09-26', volumeLitros: 950, tanqueId: 'tank-1', status: 'Em Produção', diaAtual: 9, diasPlanejados: 14 },
  { id: 'batch-2', codigo: 'L2026-085', estilo: 'Helles Lager', dataBrassagem: '2026-09-30', volumeLitros: 1800, tanqueId: 'tank-2', status: 'Em Produção', diaAtual: 5, diasPlanejados: 21 },
  { id: 'batch-3', codigo: 'L2026-081', estilo: 'American Pale Ale', dataBrassagem: '2026-09-18', volumeLitros: 920, tanqueId: 'tank-4', status: 'Em Produção', diaAtual: 17, diasPlanejados: 21 },
  { id: 'batch-4', codigo: 'L2026-079', estilo: 'Pilsen', dataBrassagem: '2026-09-12', volumeLitros: 980, tanqueId: 'tank-6', status: 'Em Produção', diaAtual: 23, diasPlanejados: 23 },
  { id: 'batch-5', codigo: 'L2026-078', estilo: 'Witbier', dataBrassagem: '2026-09-08', volumeLitros: 850, tanqueId: 'tank-3', status: 'Concluído', diaAtual: 18, diasPlanejados: 18 },
];

export const initialMeasurements: Measurement[] = [
  { id: 'm1', loteId: 'batch-1', dataHora: '2026-10-04T09:00:00', temperatura: 19.2, densidade: 1.018, pressao: 0.8, ph: 4.4, observacao: 'Fermentação ativa, aroma cítrico.' },
  { id: 'm2', loteId: 'batch-1', dataHora: '2026-10-03T09:00:00', temperatura: 19.4, densidade: 1.022, pressao: 0.7, ph: 4.5, observacao: 'Atividade normal.' },
  { id: 'm3', loteId: 'batch-1', dataHora: '2026-10-02T09:00:00', temperatura: 20.1, densidade: 1.029, pressao: 0.6, ph: 4.6, observacao: 'Temperatura ajustada.' },
  { id: 'm4', loteId: 'batch-1', dataHora: '2026-10-01T09:00:00', temperatura: 20.5, densidade: 1.038, pressao: 0.5, ph: 4.7, observacao: 'Fermentação vigorosa.' },
  { id: 'm5', loteId: 'batch-2', dataHora: '2026-10-04T09:00:00', temperatura: 10.2, densidade: 1.042, pressao: 0.5, ph: 5.1, observacao: 'Perfil dentro do esperado.' },
  { id: 'm6', loteId: 'batch-3', dataHora: '2026-10-04T09:00:00', temperatura: 2.5, densidade: 1.012, pressao: 1.1, ph: 4.3, observacao: 'Maturação estável.' },
  { id: 'm7', loteId: 'batch-4', dataHora: '2026-10-04T09:00:00', temperatura: 1.8, densidade: 1.010, pressao: 1.5, ph: 4.2, observacao: 'Lote pronto para envase.' },
];

export const initialCustomers: Customer[] = [
  { id: 'customer-1', nomeEmpresa: 'Bar do Malte', contato: '(11) 98765-4321', cidade: 'São Paulo, SP', documento: '12.345.678/0001-90' },
  { id: 'customer-2', nomeEmpresa: 'Empório Cervejeiro', contato: '(11) 97654-3210', cidade: 'Campinas, SP', documento: '45.678.901/0001-23' },
  { id: 'customer-3', nomeEmpresa: 'Boteco da Vila', contato: '(19) 99876-5432', cidade: 'Jundiaí, SP', documento: '34.567.890/0001-12' },
  { id: 'customer-4', nomeEmpresa: 'Casa Hopfen', contato: '(11) 96543-2109', cidade: 'Santo André, SP', documento: '23.456.789/0001-01' },
];

export const initialOrders: Order[] = [
  { id: 'PED-2408', clienteId: 'customer-1', dataPedido: '2026-10-03', dataEntrega: '2026-10-07', status: 'Confirmado', itens: [{ estilo: 'West Coast IPA', formato: 'Barril 30L', quantidade: 2, valorUnitario: 540 }], valorTotal: 1080 },
  { id: 'PED-2407', clienteId: 'customer-2', dataPedido: '2026-10-02', dataEntrega: '2026-10-06', status: 'Em Envase/Separação', itens: [{ estilo: 'Pilsen', formato: 'Barril 50L', quantidade: 3, valorUnitario: 720 }], valorTotal: 2160 },
  { id: 'PED-2406', clienteId: 'customer-3', dataPedido: '2026-10-01', dataEntrega: '2026-10-08', status: 'Pronto p/ Envio', itens: [{ estilo: 'American Pale Ale', formato: 'Barril 30L', quantidade: 2, valorUnitario: 510 }], valorTotal: 1020 },
  { id: 'PED-2405', clienteId: 'customer-4', dataPedido: '2026-09-29', dataEntrega: '2026-10-04', status: 'Entregue', itens: [{ estilo: 'Witbier', formato: 'Caixa de lata', quantidade: 12, valorUnitario: 86 }], valorTotal: 1032 },
];
