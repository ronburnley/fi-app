import { useState } from 'react';
import { Card, Button } from '../ui';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';
import { LifeEventEditForm } from './LifeEventEditForm';
import type { LifeEvent } from '../../types';

export function LifeEventsSection() {
  const { state, dispatch } = useApp();
  const { lifeEvents } = state;

  const [editingEvent, setEditingEvent] = useState<LifeEvent | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const sortedEvents = [...lifeEvents].sort((a, b) => a.year - b.year);

  const handleAddEvent = (event: LifeEvent) => {
    dispatch({ type: 'ADD_LIFE_EVENT', payload: event });
    setIsAdding(false);
  };

  const handleUpdateEvent = (event: LifeEvent) => {
    dispatch({ type: 'UPDATE_LIFE_EVENT', payload: event });
    setEditingEvent(null);
  };

  const handleDeleteEvent = (id: string) => {
    dispatch({ type: 'REMOVE_LIFE_EVENT', payload: id });
  };

  return (
    <Card title="Life Events">
      <div className="space-y-4">
        <p className="text-xs text-text-muted">
          One-time income or expenses (inheritance, home purchase, college, etc.)
        </p>

        {/* Events Table */}
        <div className="border border-border-subtle rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-tertiary">
                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">Event</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">Year</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-text-muted">Amount</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-text-muted w-20">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedEvents.map((event) => (
                <tr
                  key={event.id}
                  className="border-b border-border-subtle hover:bg-bg-tertiary/50 transition-colors"
                >
                  <td className="px-3 py-2.5 text-text-primary text-sm">
                    {event.name}
                  </td>
                  <td className="px-3 py-2.5 text-text-secondary text-sm tabular-nums">
                    {event.year}
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                    <span className={event.amount >= 0 ? 'text-accent-danger' : 'text-accent-primary'}>
                      {event.amount >= 0 ? '-' : '+'}{formatCurrency(Math.abs(event.amount))}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingEvent(event)}
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
                        onClick={() => handleDeleteEvent(event.id)}
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
              ))}
              {sortedEvents.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-text-muted text-sm">
                    No life events added yet. Click "Add Life Event" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add Button */}
        <Button
          variant="secondary"
          onClick={() => setIsAdding(true)}
          className="w-full"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Life Event
        </Button>
      </div>

      {/* Add Modal */}
      {isAdding && (
        <LifeEventEditForm
          onSave={handleAddEvent}
          onCancel={() => setIsAdding(false)}
        />
      )}

      {/* Edit Modal */}
      {editingEvent && (
        <LifeEventEditForm
          event={editingEvent}
          onSave={handleUpdateEvent}
          onCancel={() => setEditingEvent(null)}
        />
      )}
    </Card>
  );
}
