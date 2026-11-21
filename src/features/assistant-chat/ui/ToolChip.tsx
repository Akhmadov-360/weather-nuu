import { useTranslation } from 'react-i18next';
import LatticeLoader from '@/components/ui/lattice-loader';
import type { ToolStep } from '../model/conversation';
import { toolKey } from '../model/error-keys';

/** One step of the assistant's work, as a small lattice: it moves while the tool runs and settles when it is done. */
export function ToolChip({ step }: { step: Pick<ToolStep, 'name' | 'status'> }): React.JSX.Element {
  const { t } = useTranslation('assistant');
  return (
    <LatticeLoader
      pattern="orbit"
      grid={3}
      cellSize={5}
      gap={2}
      fontSize={13}
      showTimer={false}
      color="var(--ai-accent)"
      status={step.status === 'working' ? 'working' : step.status === 'done' ? 'done' : 'error'}
      label={t(toolKey(step.name))}
      doneLabel={t('assistant_tool_done')}
      errorLabel={t('assistant_tool_error')}
    />
  );
}
