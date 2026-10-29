import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const SupportSafetyScreen: React.FC = () => {
  const { supportTickets, createSupportTicket, sendSupportReply, t } = useApp();

  const [activeTicketId, setActiveTicketId] = useState<string | null>(
    supportTickets.length > 0 ? supportTickets[0].id : null
  );
  const [replyText, setReplyText] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<'dispute' | 'verification' | 'fraud' | 'payments' | 'general'>('general');
  const [newMessage, setNewMessage] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  const selectedTicket = supportTickets.find((t) => t.id === activeTicketId);

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicketId || !replyText.trim()) return;
    sendSupportReply(activeTicketId, replyText.trim());
    setReplyText('');
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) return;
    createSupportTicket(newSubject.trim(), newCategory, newMessage.trim());
    setNewSubject('');
    setNewMessage('');
    setShowNewModal(false);
  };

  return (
    <div className="flex-1 flex flex-col w-full pb-24 sm:pb-12 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white px-4 py-6 sm:px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-emerald-400">shield_with_heart</span>
              <h1 className="text-xl font-bold">Safety, Dispute & Support Center</h1>
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              {t(
                'supportCenterSubtitle',
                'Guidance for safe property transactions, dispute mediation, and marketplace support.'
              )}
            </p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>Open Support Case</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Safety Guidelines Column */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white mb-2.5">
              <span className="material-symbols-outlined text-amber-500 text-[18px]">verified_user</span>
              <span>{t('safetyGuidelines', 'Safety Guidelines')}</span>
            </h3>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">•</span>
                <span><strong>Never send un-escrowed funds:</strong> Avoid direct peer transfers to personal mobile wallets without contract execution.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">•</span>
                <span><strong>Check physical boundary beacons:</strong> Always verify stone beacons against the cadastral survey map.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">•</span>
                <span><strong>Independent legal counsel:</strong> Engage an independent advocate or notary public to audit registry folios.</span>
              </li>
            </ul>
          </div>

          {/* Active Cases List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Your Support Inquiries ({supportTickets.length})
            </h3>
            <div className="space-y-2">
              {supportTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-6 px-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  <span className="material-symbols-outlined text-2xl text-slate-400 dark:text-slate-500 mb-1.5">
                    mark_email_unread
                  </span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t('noSupportTicketsTitle', 'No support tickets yet')}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    {t('noSupportTicketsDesc', 'Open a support case to start a conversation with our team.')}
                  </p>
                </div>
              ) : (
                supportTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => setActiveTicketId(ticket.id)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors cursor-pointer border ${
                      activeTicketId === ticket.id
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/40 text-emerald-950 dark:text-emerald-200 font-semibold'
                        : 'border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                      <span className="uppercase font-bold tracking-wider">{ticket.category}</span>
                      <span>{ticket.createdAt}</span>
                    </div>
                    <p className="truncate">{ticket.subject}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Selected Case Conversation */}
        <div className="md:col-span-2">
          {selectedTicket ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[520px]">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {selectedTicket.category.toUpperCase()} • ID: {selectedTicket.id}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedTicket.subject}
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  {selectedTicket.status.toUpperCase()}
                </span>
              </div>

              {/* Message History */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {selectedTicket.messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      m.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl p-3 text-xs ${
                        m.sender === 'user'
                          ? 'bg-emerald-700 text-white rounded-tr-none'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span className="text-[10px] opacity-75 block mb-1 font-semibold">
                        {m.sender === 'user' ? t('you', 'You') : t('supportTeam', 'Support Team')}
                      </span>
                      <p>{m.text}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1">{m.timestamp}</span>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              <form onSubmit={handleSendReply} className="p-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <input
                  type="text"
                  placeholder="Provide additional details or inquiries..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Reply
                </button>
              </form>
            </div>
          ) : (
            <div className="h-[520px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-6 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">inbox</span>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Support Case Selected</p>
              <p className="text-xs text-slate-500 mt-1">Select an existing inquiry or open a new support ticket.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Submit Support Ticket</h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Topic Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="general">General Marketplace Inquiry</option>
                  <option value="dispute">Transaction / Deal Dispute</option>
                  <option value="verification">Title Deed Audit Questions</option>
                  <option value="fraud">Suspected Impersonation / Fraud</option>
                  <option value="payments">Escrow / Payment Guidance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject Summary
                </label>
                <input
                  type="text"
                  placeholder={t('supportSubjectPlaceholder', 'e.g. Payment question about my escrow deposit')}
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Message
                </label>
                <textarea
                  rows={4}
                  placeholder="Explain your inquiry in detail..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none resize-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
