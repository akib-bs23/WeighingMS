import { useEffect, useState } from 'react';
import type { BatchSummaryView, SessionView } from '../../../shared/contracts/weighing';
import type { TicketState } from '../../../shared/contracts/ticket';
import { reprintTicket, retryTicket, submitTicket } from '../../net/ticket';
import { retryWriteBack } from '../../net/write-back';

/** Screen 3's own state: the ticket (composed once, on mount) and write-back retry. */
export function useConfirmPrint(session: SessionView, initialSummary: BatchSummaryView) {
  const [summary, setSummary] = useState(initialSummary);
  const [ticket, setTicket] = useState<TicketState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void submitTicket(session.sessionId).then(setTicket);
  }, [session.sessionId]);

  /** PENDING → retry the same print; PRINTED → an explicit reprint (story 003). */
  const printOrReprint = (): void => {
    if (!ticket) return;
    setBusy(true);
    const action = ticket.status === 'PRINTED' ? reprintTicket : retryTicket;
    void action(session.sessionId)
      .then(setTicket)
      .finally(() => {
        setBusy(false);
      });
  };

  const retryWriteBackNow = (): void => {
    setBusy(true);
    void retryWriteBack(session.sessionId)
      .then((writeBack) => {
        setSummary((s) => ({ ...s, writeBack }));
      })
      .finally(() => {
        setBusy(false);
      });
  };

  return { summary, ticket, busy, printOrReprint, retryWriteBackNow };
}
