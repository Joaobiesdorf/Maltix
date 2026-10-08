import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

export default function SuccessMessage({ show, message }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.9 }}
          className="fixed bottom-6 right-6 bg-white border border-gray-100 shadow-xl rounded-2xl px-5 py-4 flex items-center gap-3 z-[999]"
        >
          <div className="bg-emerald-100 text-emerald-700 p-2 rounded-full">
            <Check size={16} />
          </div>

          <span className="font-semibold text-accent text-sm">
            {message}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}