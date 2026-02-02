import type { Asset } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { ACCOUNT_TYPE_LABELS, ACCOUNT_OWNER_LABELS } from '../../constants/defaults';

interface AssetRowProps {
  asset: Asset;
  showOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function AssetRow({ asset, showOwner, onEdit, onDelete }: AssetRowProps) {
  return (
    <tr className="border-b border-border-subtle hover:bg-bg-tertiary/50 transition-colors">
      <td className="px-3 py-2.5 text-text-primary text-sm">
        <div className="flex items-center gap-2">
          <span>{asset.name}</span>
          {asset.is401k && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted">
              401k
            </span>
          )}
          {asset.separatedFromService && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-primary/20 text-accent-primary">
              R55
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 text-text-secondary text-sm">
        {ACCOUNT_TYPE_LABELS[asset.type]}
      </td>
      {showOwner && (
        <td className="px-3 py-2.5 text-text-secondary text-sm">
          {ACCOUNT_OWNER_LABELS[asset.owner]}
        </td>
      )}
      <td className="px-3 py-2.5 text-text-primary text-sm text-right tabular-nums">
        {formatCurrency(asset.balance)}
      </td>
      <td className="px-3 py-2.5 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-text-muted hover:text-accent-danger hover:bg-accent-danger/10 rounded transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}
