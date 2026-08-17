import { useTranslation } from 'react-i18next';
import type { SelectedSheet } from '../types';

interface SheetInfoPanelProps {
  selectedSheet: SelectedSheet | null;
  onClose: () => void;
}

export function SheetInfoPanel({ selectedSheet, onClose }: SheetInfoPanelProps) {
  const { t } = useTranslation();

  if (!selectedSheet) return null;

  return (
    <div className="absolute top-4 right-4 z-50 bg-white/95 backdrop-blur-sm border border-gray-300 rounded-lg shadow-lg p-4 min-w-[220px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-gray-800">{t('sheet.title')}</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          &times;
        </button>
      </div>
      <div className="space-y-1.5 text-xs text-gray-700">
        <div className="flex justify-between">
          <span className="text-gray-500">{t('sheet.wall')}:</span>
          <span className="font-medium">{selectedSheet.wall}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">{t('sheet.bay')}:</span>
          <span className="font-medium">{selectedSheet.bayIndex + 1}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">{t('sheet.index')}:</span>
          <span className="font-medium">{selectedSheet.sheetIndex + 1}</span>
        </div>
        <hr className="border-gray-200" />
        <div className="flex justify-between">
          <span className="text-gray-500">{t('sheet.length')}:</span>
          <span className="font-medium">{Math.round(selectedSheet.length * 1000)} mm</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">{t('sheet.width')}:</span>
          <span className="font-medium">{Math.round(selectedSheet.width * 1000)} mm</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">{t('sheet.color')}:</span>
          <span className="font-medium">{selectedSheet.color}</span>
        </div>
        {selectedSheet.thickness != null && (
          <div className="flex justify-between">
            <span className="text-gray-500">{t('sheet.thickness')}:</span>
            <span className="font-medium">{selectedSheet.thickness} mm</span>
          </div>
        )}
      </div>
    </div>
  );
}
