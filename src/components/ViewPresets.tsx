import { useTranslation } from 'react-i18next';

export interface ViewPreset {
  key: string;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

interface ViewPresetsProps {
  onSelectView: (preset: ViewPreset) => void;
  hallLength: number;
  hallSpan: number;
  ridgeHeight: number;
}

export function ViewPresets({ onSelectView, hallLength, hallSpan, ridgeHeight }: ViewPresetsProps) {
  const { t } = useTranslation();

  const maxDim = Math.max(hallLength, hallSpan, ridgeHeight);
  const cameraDistance = maxDim * 1.5;

  const presets: ViewPreset[] = [
    {
      key: 'perspective',
      label: t('view.perspective'),
      position: [cameraDistance, cameraDistance * 0.7, cameraDistance],
      target: [0, ridgeHeight / 2, 0],
    },
    {
      key: 'front',
      label: t('view.front'),
      position: [-cameraDistance, ridgeHeight / 2, 0],
      target: [0, ridgeHeight / 2, 0],
    },
    {
      key: 'side',
      label: t('view.side'),
      position: [0, ridgeHeight / 2, cameraDistance],
      target: [0, ridgeHeight / 2, 0],
    },
    {
      key: 'top',
      label: t('view.top'),
      position: [0, cameraDistance, 0],
      target: [0, 0, 0],
    },
  ];

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
      {presets.map((preset) => (
        <button
          key={preset.key}
          onClick={() => onSelectView(preset)}
          className="px-3 py-1.5 bg-dark-secondary/80 hover:bg-dark-tertiary border border-dark-tertiary rounded text-sm text-gray-300 hover:text-accent-orange transition-colors backdrop-blur-sm"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
