import { AlertTriangle, Trash2, X } from 'lucide-react';

/**
 * ConfirmModal — modal de confirmação reutilizável
 *
 * Props:
 *   isOpen      boolean
 *   onClose     () => void
 *   onConfirm   () => void
 *   title       string   — ex: "Excluir cliente"
 *   message     string   — ex: "Tem certeza que deseja excluir João Silva?"
 *   confirmText string   — padrão: "Excluir"
 *   cancelText  string   — padrão: "Cancelar"
 *   variant     "danger" | "warning" | "info"  — padrão: "danger"
 *   loading     boolean  — desabilita botões enquanto processa
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar ação',
  message = 'Tem certeza que deseja continuar? Esta ação não pode ser desfeita.',
  confirmText = 'Excluir',
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false,
}) {
  if (!isOpen) return null;

  const styles = {
    danger: {
      icon: Trash2,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      btn: 'bg-red-500 hover:bg-red-600 text-white',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      btn: 'bg-amber-500 hover:bg-amber-600 text-white',
    },
    info: {
      icon: AlertTriangle,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      btn: 'bg-blue-500 hover:bg-blue-600 text-white',
    },
  };

  const s = styles[variant] || styles.danger;
  const Icon = s.icon;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={!loading ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5">

        {/* Botão fechar */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-40"
        >
          <X size={18} />
        </button>

        {/* Ícone + textos */}
        <div className="flex flex-col items-center text-center gap-3 pt-2">
          <div className={`w-14 h-14 rounded-2xl ${s.iconBg} flex items-center justify-center`}>
            <Icon size={26} className={s.iconColor} />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-800">{title}</h2>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl font-black text-sm active:scale-95 transition-all disabled:opacity-60 ${s.btn}`}
          >
            {loading ? 'Aguarde...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}