import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { signInWithGoogle, signOutGoogle, getCachedAccessToken } from '../services/authService';
import { workspaceInstance, EmailMessage, CalendarEventItem, ContactItem } from '../services/workspaceService';
import { jarvisMemoryEngine } from '../services/memoryEngine';
import { OAuthTroubleshooterModal } from './OAuthTroubleshooterModal';
import {
  X,
  CheckCircle2,
  ShieldCheck,
  Link2,
  RefreshCw,
  LogOut,
  User as UserIcon,
  AlertCircle,
  Mail,
  Calendar,
  Users,
  Send,
  Plus,
  Clock,
  MapPin,
  Sparkles,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  ShieldAlert
} from 'lucide-react';

interface ConnectorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUserUpdate: (user: User | null) => void;
}

type WorkspaceTab = 'overview' | 'gmail' | 'calendar' | 'contacts';

export const ConnectorsModal: React.FC<ConnectorsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdate
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTroubleshooter, setShowTroubleshooter] = useState(false);

  // Live Workspace Data States
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [fetchingData, setFetchingData] = useState(false);

  // Email Compose Form & Confirmation
  const [showCompose, setShowCompose] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showSendConfirmation, setShowSendConfirmation] = useState(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState<string | null>(null);

  // Calendar Event Add Form & Confirmation
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [eventSummary, setEventSummary] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [showEventConfirmation, setShowEventConfirmation] = useState(false);
  const [eventSuccessMsg, setEventSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentUser && getCachedAccessToken()) {
      fetchWorkspaceData();
    }
  }, [isOpen, currentUser]);

  const fetchWorkspaceData = async () => {
    if (!getCachedAccessToken()) return;
    setFetchingData(true);
    setError(null);
    try {
      const [emailList, eventList, contactList] = await Promise.allSettled([
        workspaceInstance.listRecentEmails(10),
        workspaceInstance.listUpcomingEvents(10),
        workspaceInstance.listContacts(20)
      ]);

      if (emailList.status === 'fulfilled') {
        setEmails(emailList.value);
        // Memorize recent email senders and subjects to J.A.R.V.I.S. memory
        if (emailList.value.length > 0) {
          jarvisMemoryEngine.addSemanticFact({
            subject: 'User Gmail Inbox',
            predicate: 'contains recent messages regarding',
            object: emailList.value.slice(0, 3).map(e => `"${e.subject}" from ${e.from}`).join('; '),
            domain: 'workflow',
            confidence: 0.95,
            tags: ['gmail', 'inbox', 'recent']
          });
        }
      }

      if (eventList.status === 'fulfilled') {
        setEvents(eventList.value);
        if (eventList.value.length > 0) {
          jarvisMemoryEngine.addSemanticFact({
            subject: 'User Calendar',
            predicate: 'has upcoming events',
            object: eventList.value.slice(0, 3).map(ev => `${ev.summary} (${ev.start})`).join('; '),
            domain: 'workflow',
            confidence: 0.95,
            tags: ['calendar', 'events']
          });
        }
      }

      if (contactList.status === 'fulfilled') {
        setContacts(contactList.value);
      }
    } catch (err: any) {
      console.error('Failed to load workspace data:', err);
    } finally {
      setFetchingData(false);
    }
  };

  if (!isOpen) return null;

  const handleGoogleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await signInWithGoogle();
      onUserUpdate(res.user);

      if (res.user.displayName || res.user.email) {
        const userName = res.user.displayName || 'Sir';
        const userEmail = res.user.email || 'unknown';

        jarvisMemoryEngine.addLongTermMemory({
          category: 'user_profile',
          title: `Connected User Identity (${userName})`,
          content: `Authenticated Google Account: ${userName} <${userEmail}>. Authorized for J.A.R.V.I.S. Workspace connectors (Gmail, Calendar, Contacts).`,
          importance: 'high',
          isPinned: true
        });

        jarvisMemoryEngine.addSemanticFact({
          subject: 'Active User',
          predicate: 'is authenticated as',
          object: `${userName} (${userEmail})`,
          domain: 'identity',
          confidence: 1.0,
          tags: ['auth', 'google', 'identity', 'workspace']
        });
      }

      // Automatically fetch workspace data
      await fetchWorkspaceData();
    } catch (err: any) {
      console.error('Authentication error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Authentication popup closed before selection.');
      } else {
        setError(err.message || 'Failed to authenticate Google Account.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await signOutGoogle();
      onUserUpdate(null);
      setEmails([]);
      setEvents([]);
      setContacts([]);
    } catch (err: any) {
      console.error('Sign out error:', err);
      setError(err.message || 'Failed to disconnect account.');
    } finally {
      setLoading(false);
    }
  };

  // Perform Email Sending after user confirmation
  const handleConfirmSendEmail = async () => {
    if (!emailTo || !emailSubject || !emailBody) {
      setError('Please fill in all email fields (recipient, subject, and message).');
      return;
    }

    setIsSendingEmail(true);
    setError(null);
    setShowSendConfirmation(false);

    try {
      const result = await workspaceInstance.sendEmail(emailTo, emailSubject, emailBody);
      setSendSuccessMsg(`Email successfully dispatched (ID: ${result.id.slice(0, 8)}...)`);
      
      // Log to episodic memory
      jarvisMemoryEngine.recordSessionEpisode(
        `Dispatched Email to ${emailTo}`,
        `Sent email with subject "${emailSubject}" on behalf of ${currentUser?.displayName || 'User'}.`,
        [`Email ID: ${result.id}`, `Recipient: ${emailTo}`]
      );

      // Clear form
      setEmailTo('');
      setEmailSubject('');
      setEmailBody('');
      setShowCompose(false);
      // Refresh inbox
      workspaceInstance.listRecentEmails(10).then(setEmails).catch(() => {});
    } catch (err: any) {
      console.error('Send email error:', err);
      setError(`Failed to send email: ${err.message || 'Check Gmail permissions'}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Perform Calendar Event Creation after user confirmation
  const handleConfirmCreateEvent = async () => {
    if (!eventSummary || !eventStart || !eventEnd) {
      setError('Please provide event title, start time, and end time.');
      return;
    }

    setIsCreatingEvent(true);
    setError(null);
    setShowEventConfirmation(false);

    try {
      const newEv = await workspaceInstance.createCalendarEvent(
        eventSummary,
        eventDescription,
        new Date(eventStart).toISOString(),
        new Date(eventEnd).toISOString(),
        eventLocation
      );

      setEventSuccessMsg(`Calendar event "${newEv.summary}" created successfully!`);

      // Log to episodic memory
      jarvisMemoryEngine.recordSessionEpisode(
        `Scheduled Calendar Event: ${newEv.summary}`,
        `Added event to Google Calendar for ${newEv.start} at ${eventLocation || 'specified time'}.`,
        [`Event Title: ${newEv.summary}`, `Time: ${newEv.start}`]
      );

      setEventSummary('');
      setEventDescription('');
      setEventStart('');
      setEventEnd('');
      setEventLocation('');
      setShowAddEvent(false);
      workspaceInstance.listUpcomingEvents(10).then(setEvents).catch(() => {});
    } catch (err: any) {
      console.error('Create event error:', err);
      setError(`Failed to create calendar event: ${err.message || 'Check Calendar permissions'}`);
    } finally {
      setIsCreatingEvent(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-950/95 border border-cyan-500/30 rounded-3xl shadow-[0_0_60px_rgba(6,182,212,0.25)] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-cyan-500/20 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono tracking-wide">
                WORKSPACE CONNECTORS &amp; TELEMETRY
              </h2>
              <p className="text-[11px] text-cyan-400/80 font-mono">
                Google Account &bull; Gmail &bull; Calendar &bull; Contacts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs (Available when connected) */}
        {currentUser && (
          <div className="px-6 py-2 border-b border-slate-800 bg-slate-900/30 flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              Overview
            </button>

            <button
              onClick={() => setActiveTab('gmail')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'gmail'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-red-400" />
              Gmail ({emails.length})
            </button>

            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'calendar'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              Calendar ({events.length})
            </button>

            <button
              onClick={() => setActiveTab('contacts')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'contacts'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              Contacts ({contacts.length})
            </button>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={fetchWorkspaceData}
                disabled={fetchingData}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-mono transition-colors flex items-center gap-1"
                title="Refresh Google Workspace Data"
              >
                <RefreshCw className={`w-3 h-3 ${fetchingData ? 'animate-spin text-cyan-400' : ''}`} />
                <span>Sync</span>
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
          {error && (
            <div className="p-4 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <div>
                  <div className="font-bold font-mono text-red-300">Authentication Blocked</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">{error}</div>
                </div>
              </div>
              <button
                onClick={() => setShowTroubleshooter(true)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Fix Redirect / 403 Guide
              </button>
            </div>
          )}

          {sendSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-200 text-xs flex items-center justify-between gap-2.5 animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{sendSuccessMsg}</span>
              </div>
              <button onClick={() => setSendSuccessMsg(null)} className="text-emerald-400 hover:underline text-[10px]">
                Dismiss
              </button>
            </div>
          )}

          {eventSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-200 text-xs flex items-center justify-between gap-2.5 animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{eventSuccessMsg}</span>
              </div>
              <button onClick={() => setEventSuccessMsg(null)} className="text-emerald-400 hover:underline text-[10px]">
                Dismiss
              </button>
            </div>
          )}

          {/* TAB 1: OVERVIEW & AUTHENTICATION */}
          {(!currentUser || activeTab === 'overview') && (
            <div className="flex flex-col gap-4">
              {/* Google Account Connector Card */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-cyan-500/20 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white p-2 flex items-center justify-center shadow-md shrink-0">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-full h-full">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        Google Workspace Account
                        {currentUser && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> CONNECTED
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Authorizes J.A.R.V.I.S. to access your Gmail inbox, manage Calendar events, and search Contacts.
                      </p>
                    </div>
                  </div>
                </div>

                {currentUser ? (
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/20 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {currentUser.photoURL ? (
                          <img
                            src={currentUser.photoURL}
                            alt="Profile"
                            className="w-10 h-10 rounded-full border border-cyan-400/40"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                            <UserIcon className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-bold text-white font-mono">
                            {currentUser.displayName || 'Google User'}
                          </div>
                          <div className="text-xs text-cyan-400/80 font-mono">
                            {currentUser.email}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleGoogleDisconnect}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-950/60 hover:text-red-300 text-slate-300 border border-slate-700 hover:border-red-500/40 text-xs font-mono transition-all flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Disconnect
                      </button>
                    </div>

                    {/* Active Permission Badges */}
                    <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-[10px] font-mono flex items-center gap-1">
                        <Mail className="w-3 h-3" /> Gmail (Read &amp; Send)
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[10px] font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Google Calendar (Events)
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono flex items-center gap-1">
                        <Users className="w-3 h-3" /> Google Contacts (People)
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <ShieldCheck className="w-3.5 h-3.5" /> J.A.R.V.I.S. Core Authorized
                      </span>
                      <button
                        onClick={handleGoogleConnect}
                        disabled={loading}
                        className="text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Switch Account / Re-authenticate
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 pt-1">
                    <button
                      onClick={handleGoogleConnect}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                    >
                      {loading ? (
                        <RefreshCw className="w-5 h-5 animate-spin text-slate-900" />
                      ) : (
                        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        </svg>
                      )}
                      <span>Sign in with Google Account</span>
                    </button>
                    
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-[11px] text-slate-400 font-mono">
                        Requires valid Google Cloud Console redirect setup.
                      </p>
                      <button
                        onClick={() => setShowTroubleshooter(true)}
                        className="text-[11px] font-mono text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1"
                      >
                        <ShieldAlert className="w-3 h-3" />
                        Fix Error 400 / 403 Guide
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Workspace Stats cards if connected */}
              {currentUser && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => setActiveTab('gmail')}
                    className="p-4 rounded-2xl bg-slate-900/50 border border-red-500/20 hover:border-red-500/40 cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-red-300 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> Gmail
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="mt-3">
                      <div className="text-2xl font-bold font-mono text-white">{emails.length}</div>
                      <div className="text-[11px] text-slate-400">Recent Messages Synced</div>
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTab('calendar')}
                    className="p-4 rounded-2xl bg-slate-900/50 border border-blue-500/20 hover:border-blue-500/40 cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-blue-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> Calendar
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="mt-3">
                      <div className="text-2xl font-bold font-mono text-white">{events.length}</div>
                      <div className="text-[11px] text-slate-400">Upcoming Events</div>
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTab('contacts')}
                    className="p-4 rounded-2xl bg-slate-900/50 border border-emerald-500/20 hover:border-emerald-500/40 cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-emerald-300 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Contacts
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="mt-3">
                      <div className="text-2xl font-bold font-mono text-white">{contacts.length}</div>
                      <div className="text-[11px] text-slate-400">Contacts Indexed</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GMAIL LIVE INBOX & COMPOSER */}
          {currentUser && activeTab === 'gmail' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-red-400" />
                  <h3 className="text-sm font-bold text-white font-mono">GMAIL INBOX TELEMETRY</h3>
                </div>
                <button
                  onClick={() => setShowCompose(!showCompose)}
                  className="px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                >
                  {showCompose ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  {showCompose ? 'Cancel Compose' : 'Compose Email'}
                </button>
              </div>

              {/* Compose Box */}
              {showCompose && (
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-red-500/30 flex flex-col gap-3 animate-fade-in">
                  <span className="text-xs font-mono font-bold text-red-300">
                    NEW EMAIL DISPATCH (Requires Explicit Confirmation)
                  </span>
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Recipient (To:)</label>
                    <input
                      type="email"
                      placeholder="recipient@example.com"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Subject</label>
                    <input
                      type="text"
                      placeholder="Email subject..."
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Message Body</label>
                    <textarea
                      rows={4}
                      placeholder="Type your message..."
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-400 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowCompose(false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-mono"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setShowSendConfirmation(true)}
                      disabled={!emailTo || !emailSubject || !emailBody}
                      className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Review &amp; Send
                    </button>
                  </div>
                </div>
              )}

              {/* Send Confirmation Dialog (MANDATORY User Confirmation for Mutating/Sending Ops) */}
              {showSendConfirmation && (
                <div className="p-4 rounded-2xl bg-red-950/90 border border-red-500/50 shadow-2xl flex flex-col gap-3 animate-fade-in">
                  <div className="flex items-center gap-2 text-red-300 font-mono font-bold text-sm">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    Confirm Email Dispatch
                  </div>
                  <p className="text-xs text-slate-200">
                    Are you sure you want to send this email on behalf of <span className="font-mono text-cyan-300">{currentUser.email}</span>?
                  </p>
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-red-500/20 text-xs font-mono space-y-1 text-slate-300">
                    <div><strong className="text-slate-400">To:</strong> {emailTo}</div>
                    <div><strong className="text-slate-400">Subject:</strong> {emailSubject}</div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setShowSendConfirmation(false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-mono"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmSendEmail}
                      disabled={isSendingEmail}
                      className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg"
                    >
                      {isSendingEmail ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Confirm &amp; Send Email
                    </button>
                  </div>
                </div>
              )}

              {/* Email List */}
              {emails.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900/30 border border-slate-800 text-center flex flex-col items-center justify-center gap-2">
                  <Mail className="w-8 h-8 text-slate-600" />
                  <p className="text-xs text-slate-400 font-mono">No recent emails found in primary inbox.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {emails.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-3.5 rounded-2xl bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 hover:border-red-500/30 transition-all flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white font-mono truncate max-w-[70%]">
                          {msg.subject}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {msg.date ? new Date(msg.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                        </span>
                      </div>
                      <div className="text-[11px] text-red-300/90 font-mono truncate">
                        From: {msg.from}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {msg.snippet}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GOOGLE CALENDAR */}
          {currentUser && activeTab === 'calendar' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-white font-mono">GOOGLE CALENDAR SCHEDULE</h3>
                </div>
                <button
                  onClick={() => setShowAddEvent(!showAddEvent)}
                  className="px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                >
                  {showAddEvent ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  {showAddEvent ? 'Cancel' : 'Add Event'}
                </button>
              </div>

              {/* Add Event Form */}
              {showAddEvent && (
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-blue-500/30 flex flex-col gap-3 animate-fade-in">
                  <span className="text-xs font-mono font-bold text-blue-300">
                    CREATE CALENDAR ENTRY (Requires User Confirmation)
                  </span>
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Event Title</label>
                    <input
                      type="text"
                      placeholder="Meeting with Tony Stark..."
                      value={eventSummary}
                      onChange={(e) => setEventSummary(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-mono text-slate-400 block mb-1">Start Time</label>
                      <input
                        type="datetime-local"
                        value={eventStart}
                        onChange={(e) => setEventStart(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-mono text-slate-400 block mb-1">End Time</label>
                      <input
                        type="datetime-local"
                        value={eventEnd}
                        onChange={(e) => setEventEnd(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Location (Optional)</label>
                    <input
                      type="text"
                      placeholder="Stark Tower / Google Meet..."
                      value={eventLocation}
                      onChange={(e) => setEventLocation(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowAddEvent(false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-mono"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setShowEventConfirmation(true)}
                      disabled={!eventSummary || !eventStart || !eventEnd}
                      className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Review &amp; Schedule
                    </button>
                  </div>
                </div>
              )}

              {/* Event Creation Confirmation */}
              {showEventConfirmation && (
                <div className="p-4 rounded-2xl bg-blue-950/90 border border-blue-500/50 shadow-2xl flex flex-col gap-3 animate-fade-in">
                  <div className="flex items-center gap-2 text-blue-300 font-mono font-bold text-sm">
                    <AlertCircle className="w-5 h-5 text-blue-400" />
                    Confirm Calendar Event Creation
                  </div>
                  <p className="text-xs text-slate-200">
                    Are you sure you want to add this event to your primary Google Calendar?
                  </p>
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-blue-500/20 text-xs font-mono space-y-1 text-slate-300">
                    <div><strong className="text-slate-400">Event:</strong> {eventSummary}</div>
                    <div><strong className="text-slate-400">Start:</strong> {eventStart}</div>
                    <div><strong className="text-slate-400">End:</strong> {eventEnd}</div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setShowEventConfirmation(false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-mono"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmCreateEvent}
                      disabled={isCreatingEvent}
                      className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg"
                    >
                      {isCreatingEvent ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                      Confirm &amp; Add Event
                    </button>
                  </div>
                </div>
              )}

              {/* Events List */}
              {events.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900/30 border border-slate-800 text-center flex flex-col items-center justify-center gap-2">
                  <Calendar className="w-8 h-8 text-slate-600" />
                  <p className="text-xs text-slate-400 font-mono">No upcoming calendar events scheduled.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {events.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3.5 rounded-2xl bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 hover:border-blue-500/30 transition-all flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white font-mono">
                          {ev.summary}
                        </span>
                        {ev.htmlLink && (
                          <a
                            href={ev.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-mono text-blue-400 hover:underline flex items-center gap-1"
                          >
                            Google Calendar <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                      <div className="text-[11px] text-blue-300/90 font-mono flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-blue-400" />
                          {ev.start ? new Date(ev.start).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'No Time'}
                        </span>
                        {ev.location && (
                          <span className="flex items-center gap-1 text-slate-400">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {ev.location}
                          </span>
                        )}
                      </div>
                      {ev.description && (
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {ev.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CONTACTS */}
          {currentUser && activeTab === 'contacts' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white font-mono">GOOGLE CONTACTS DIRECTORY</h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {contacts.length} Contacts Available
                </span>
              </div>

              {contacts.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900/30 border border-slate-800 text-center flex flex-col items-center justify-center gap-2">
                  <Users className="w-8 h-8 text-slate-600" />
                  <p className="text-xs text-slate-400 font-mono">No contacts found in connected account.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {contacts.map((c, idx) => (
                    <div
                      key={c.resourceName || idx}
                      className="p-3 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center gap-3"
                    >
                      {c.photoUrl ? (
                        <img
                          src={c.photoUrl}
                          alt={c.name}
                          className="w-9 h-9 rounded-full border border-emerald-400/40 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
                          <UserIcon className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white font-mono truncate">{c.name}</div>
                        {c.email && (
                          <div className="text-[11px] text-emerald-400/80 font-mono truncate">{c.email}</div>
                        )}
                        {c.phoneNumber && (
                          <div className="text-[10px] text-slate-400 font-mono">{c.phoneNumber}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-cyan-500/20 bg-slate-900/40 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-400">
            J.A.R.V.I.S. Multi-Channel Google Workspace Integration
          </span>
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-colors"
          >
            Done
          </button>
        </div>

      </div>

      {/* OAuth Diagnostic & Step-by-Step Troubleshooter Overlay Modal */}
      <OAuthTroubleshooterModal
        isOpen={showTroubleshooter}
        onClose={() => setShowTroubleshooter(false)}
      />
    </div>
  );
};
