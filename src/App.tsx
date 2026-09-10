import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Search,
  Plus,
  X,
  Send,
  Trash2,
  Inbox,
  UserCircle2,
  Phone,
  Mail,
  Briefcase,
  Clock,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  ChevronDown,
  Layers,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';

// ⚠️ עדכני כאן את פרטי הפרויקט שלך מ-Supabase (Settings → API)
const SUPABASE_URL = 'https://oeugqokdutitaplthvip.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldWdxb2tkdXRpdGFwbHRodmlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMTY0NDcsImV4cCI6MjEwMzg5MjQ0N30.a8vCURKw9Y1xuCcTy9_dCbhgtgSUZPWF8IXxyqhyE_I';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STATUS = {
  new: { label: 'חדש', color: '#2F6FE4', bg: '#EAF1FD' },
  open: { label: 'פתוח', color: '#6D5BD0', bg: '#F0EDFB' },
  pending: { label: 'ממתין', color: '#B7791F', bg: '#FBF1E1' },
  resolved: { label: 'טופל', color: '#1F9254', bg: '#E7F6EE' },
  closed: { label: 'סגור', color: '#667085', bg: '#F0F1F3' },
};

const PRIORITY = {
  urgent: { label: 'דחוף', color: '#D64545' },
  high: { label: 'גבוה', color: '#B7791F' },
  normal: { label: 'רגיל', color: '#2F6FE4' },
  low: { label: 'נמוך', color: '#98A2B3' },
};

const STATUS_ORDER = ['new', 'open', 'pending', 'resolved', 'closed'];
const AVATAR_PALETTE = [
  '#3949AB',
  '#1F9254',
  '#B7791F',
  '#6D5BD0',
  '#D64545',
  '#2F6FE4',
];

const TAG_TREE_LABEL = 'C-DATA'; // כותרת עליונה קוסמטית בלבד — לא נוספת כתגית בעצמה
const TAG_TREE = [
  {
    name: 'Microsoft',
    children: [
      { name: 'Microsoft ticket' },
      { name: 'Microsoft general fault' },
      { name: 'Azure Ticket' },
      { name: 'Microsoft Licenses' },
      { name: 'Microsoft products' },
    ],
  },
  {
    name: 'ALSO',
    children: [
      { name: 'ALSO Security issues' },
      { name: 'Escalation to Also' },
      { name: 'ALSO Licenses issues' },
      { name: 'Billing issues' },
    ],
  },
  {
    name: 'Acronis',
    children: [
      { name: 'Acronis data center issue' },
      { name: 'Acronis general fault' },
    ],
  },
  { name: 'C-CLOUD' },
  { name: 'Wasabi' },
  { name: 'Zerto' },
  { name: 'Account Changes' },
  { name: 'Cloud Hub' },
];

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

function avatarColor(id) {
  let sum = 0;
  for (const ch of String(id)) sum += ch.charCodeAt(0);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'עכשיו';
  if (min < 60) return `לפני ${min} דק'`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `לפני ${hr} שעות`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'אתמול';
  return `לפני ${day} ימים`;
}

function fullDate(iso) {
  return new Date(iso).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function ticketNumber(id) {
  return `TKT-${id}`;
}

const baseFont = { fontFamily: "'Inter', sans-serif" };

export default function App() {
  // כתובת /portal (בלי צורך בהתחברות) מציגה את הטופס הציבורי ללקוחות
  const isPublicPortal =
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/$/, '').endsWith('/portal');
  if (isPublicPortal) return <PublicPortal />;
  return <SupportDeskRoot />;
}

function SupportDeskRoot() {
  const [session, setSession] = useState(undefined); // undefined = still checking, null = logged out
  const [stage, setStage] = useState('loading'); // loading | login | mfa-enroll | mfa-challenge | ready
  const [mfaFactorId, setMfaFactorId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) =>
      setSession(sess)
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      if (session === undefined) return;
      if (!session) {
        setStage('login');
        return;
      }
      // בדיקת רמת האימות הנוכחית של הסשן (aal2 = עבר גם MFA)
      const { data: levelData } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (levelData?.currentLevel === 'aal2') {
        setStage('ready');
        return;
      }
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verified = (factorsData?.totp || []).filter(
        (f) => f.status === 'verified'
      );
      if (verified.length > 0) {
        setMfaFactorId(verified[0].id);
        setStage('mfa-challenge');
      } else {
        setStage('mfa-enroll');
      }
    })();
  }, [session]);

  if (stage === 'loading') {
    return (
      <div
        dir="rtl"
        style={{ ...baseFont, color: '#667085' }}
        className="flex items-center justify-center h-full w-full p-10"
      >
        טוען…
      </div>
    );
  }

  if (stage === 'login') return <LoginScreen />;
  if (stage === 'mfa-enroll')
    return <MFAEnrollScreen onDone={() => setStage('ready')} />;
  if (stage === 'mfa-challenge')
    return (
      <MFAChallengeScreen
        factorId={mfaFactorId}
        onDone={() => setStage('ready')}
      />
    );

  return <SupportDesk />;
}

function PublicPortal() {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState('normal');
  const [system, setSystem] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { ticketId }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('smart-responder', {
      body: { name, company, email, phone, subject, priority, system, body },
    });
    setLoading(false);
    if (error) {
      setError('אירעה שגיאה בשליחה, נסי שוב בעוד רגע.');
      return;
    }
    if (data?.error) {
      setError(data.error);
      return;
    }
    setResult({ ticketId: data.ticketId });
  }

  if (result) {
    return (
      <div
        dir="rtl"
        style={{ ...baseFont, background: '#F7F8FA' }}
        className="w-full h-full flex items-center justify-center p-4"
      >
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>
        <div
          className="w-full max-w-sm rounded-xl p-6 text-center"
          style={{ background: '#FFFFFF', border: '1px solid #E4E7EC' }}
        >
          <div className="flex justify-center mb-3">
            <CheckCircle2 size={40} color="#1F9254" />
          </div>
          <div
            className="text-lg font-semibold mb-1"
            style={{ color: '#1C2128' }}
          >
            הפנייה נשלחה בהצלחה
          </div>
          <div className="text-sm mb-1" style={{ color: '#667085' }}>
            מספר הפנייה שלך:
          </div>
          <div
            className="text-base font-semibold mb-4"
            style={{ color: '#3949AB' }}
          >
            {ticketNumber(result.ticketId)}
          </div>
          <div className="text-xs" style={{ color: '#98A2B3' }}>
            נציג/ה מהצוות שלנו יחזרו אליך בהקדם.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      style={{ ...baseFont, background: '#F7F8FA' }}
      className="w-full h-full flex items-center justify-center p-4"
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl p-6"
        style={{ background: '#FFFFFF', border: '1px solid #E4E7EC' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Inbox size={20} color="#3949AB" />
          <span className="font-semibold text-lg" style={{ color: '#1C2128' }}>
            פתיחת פנייה חדשה
          </span>
        </div>
        <div className="text-sm mb-5" style={{ color: '#98A2B3' }}>
          נשמח לעזור — מלאי את הפרטים ונחזור אליך בהקדם
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs" style={{ color: '#667085' }}>
              שם מלא *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full mt-1 text-sm rounded-md px-3 py-2"
              style={{ border: '1px solid #E4E7EC' }}
            />
          </div>
          <div>
            <label className="text-xs" style={{ color: '#667085' }}>
              חברה
            </label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full mt-1 text-sm rounded-md px-3 py-2"
              style={{ border: '1px solid #E4E7EC' }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs" style={{ color: '#667085' }}>
              אימייל
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 text-sm rounded-md px-3 py-2"
              style={{ border: '1px solid #E4E7EC' }}
            />
          </div>
          <div>
            <label className="text-xs" style={{ color: '#667085' }}>
              טלפון
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full mt-1 text-sm rounded-md px-3 py-2"
              style={{ border: '1px solid #E4E7EC' }}
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="text-xs" style={{ color: '#667085' }}>
            נושא הפנייה *
          </label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            className="w-full mt-1 text-sm rounded-md px-3 py-2"
            style={{ border: '1px solid #E4E7EC' }}
          />
        </div>

        <div className="mb-3">
          <label className="text-xs" style={{ color: '#667085' }}>
            מידת דחיפות
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full mt-1 text-sm rounded-md px-3 py-2"
            style={{ border: '1px solid #E4E7EC' }}
          >
            {Object.keys(PRIORITY).map((k) => (
              <option key={k} value={k}>
                {PRIORITY[k].label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="text-xs" style={{ color: '#667085' }}>
            מערכת קשורה
          </label>
          <select
            value={system}
            onChange={(e) => setSystem(e.target.value)}
            className="w-full mt-1 text-sm rounded-md px-3 py-2"
            style={{ border: '1px solid #E4E7EC' }}
          >
            <option value="">לא ידוע / אחר</option>
            {TAG_TREE.map((node) => (
              <option key={node.name} value={node.name}>
                {node.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="text-xs" style={{ color: '#667085' }}>
            פירוט
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="w-full mt-1 text-sm rounded-md px-3 py-2 resize-none"
            style={{ border: '1px solid #E4E7EC' }}
          />
        </div>

        {error && (
          <div
            className="text-xs mb-3 px-3 py-2 rounded-md"
            style={{ color: '#D64545', background: '#FBEBEB' }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim() || !subject.trim()}
          className="w-full text-sm font-medium rounded-md py-2.5 text-white"
          style={{ background: '#3949AB' }}
        >
          {loading ? 'שולחת…' : 'שליחת פנייה'}
        </button>
      </form>
    </div>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) setError('אימייל או סיסמה שגויים, נסי שוב.');
  }

  return (
    <div
      dir="rtl"
      style={{ ...baseFont, background: '#F7F8FA' }}
      className="w-full h-full flex items-center justify-center p-4"
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl p-6"
        style={{ background: '#FFFFFF', border: '1px solid #E4E7EC' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Inbox size={20} color="#3949AB" />
          <span className="font-semibold text-lg" style={{ color: '#1C2128' }}>
            פניות תמיכה
          </span>
        </div>
        <div className="text-sm mb-5" style={{ color: '#98A2B3' }}>
          התחברות לצוות
        </div>

        <label className="text-xs" style={{ color: '#667085' }}>
          אימייל
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full mt-1 mb-3 text-sm rounded-md px-3 py-2"
          style={{ border: '1px solid #E4E7EC' }}
        />

        <label className="text-xs" style={{ color: '#667085' }}>
          סיסמה
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full mt-1 mb-4 text-sm rounded-md px-3 py-2"
          style={{ border: '1px solid #E4E7EC' }}
        />

        {error && (
          <div
            className="text-xs mb-3 px-3 py-2 rounded-md"
            style={{ color: '#D64545', background: '#FBEBEB' }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full text-sm font-medium rounded-md py-2.5 text-white"
          style={{ background: '#3949AB' }}
        >
          {loading ? 'מתחברת…' : 'התחברות'}
        </button>
      </form>
    </div>
  );
}

function MFAEnrollScreen({ onDone }) {
  const [factorId, setFactorId] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initError, setInitError] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });
      if (error) {
        setInitError(error.message);
        return;
      }
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
    })();
  }, []);

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: code.trim(),
    });
    setLoading(false);
    if (error) {
      setError('הקוד שגוי או פג תוקף, נסי שוב.');
    } else {
      onDone();
    }
  }

  return (
    <div
      dir="rtl"
      style={{ ...baseFont, background: '#F7F8FA' }}
      className="w-full h-full flex items-center justify-center p-4"
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>
      <div
        className="w-full max-w-sm rounded-xl p-6"
        style={{ background: '#FFFFFF', border: '1px solid #E4E7EC' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={20} color="#3949AB" />
          <span className="font-semibold text-lg" style={{ color: '#1C2128' }}>
            אבטחת חשבון
          </span>
        </div>
        <div className="text-sm mb-4" style={{ color: '#98A2B3' }}>
          כניסה ראשונה — נגדיר אימות דו-שלבי (MFA) כדי להגן על נתוני הלקוחות
        </div>

        {initError && (
          <div
            className="text-xs mb-3 px-3 py-2 rounded-md"
            style={{ color: '#D64545', background: '#FBEBEB' }}
          >
            {initError}
          </div>
        )}

        {qrCode && (
          <>
            <div className="text-xs mb-2" style={{ color: '#667085' }}>
              1. פתחי אפליקציית Authenticator בטלפון (Google Authenticator /
              Microsoft Authenticator / Authy) וסרקי את הקוד:
            </div>
            <div
              className="flex justify-center mb-3 p-3 rounded-md"
              style={{ background: '#F7F8FA' }}
            >
              <img
                src={qrCode}
                alt="קוד QR להגדרת MFA"
                style={{ width: 160, height: 160 }}
              />
            </div>
            <div
              className="text-[11px] mb-4 text-center"
              style={{ color: '#98A2B3' }}
            >
              אי אפשר לסרוק? הזיני ידנית:{' '}
              <span dir="ltr" style={{ fontWeight: 600 }}>
                {secret}
              </span>
            </div>

            <form onSubmit={handleVerify}>
              <label className="text-xs" style={{ color: '#667085' }}>
                2. הזיני את הקוד בן 6 הספרות מהאפליקציה
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                maxLength={6}
                inputMode="numeric"
                dir="ltr"
                className="w-full mt-1 mb-3 text-sm rounded-md px-3 py-2 text-center tracking-widest"
                style={{ border: '1px solid #E4E7EC' }}
                placeholder="000000"
              />
              {error && (
                <div
                  className="text-xs mb-3 px-3 py-2 rounded-md"
                  style={{ color: '#D64545', background: '#FBEBEB' }}
                >
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading || code.trim().length !== 6}
                className="w-full text-sm font-medium rounded-md py-2.5 text-white"
                style={{ background: '#3949AB' }}
              >
                {loading ? 'מאמתת…' : 'אימות והפעלה'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function MFAChallengeScreen({ factorId, onDone }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: code.trim(),
    });
    setLoading(false);
    if (error) {
      setError('הקוד שגוי או פג תוקף, נסי שוב.');
    } else {
      onDone();
    }
  }

  return (
    <div
      dir="rtl"
      style={{ ...baseFont, background: '#F7F8FA' }}
      className="w-full h-full flex items-center justify-center p-4"
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl p-6"
        style={{ background: '#FFFFFF', border: '1px solid #E4E7EC' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={20} color="#3949AB" />
          <span className="font-semibold text-lg" style={{ color: '#1C2128' }}>
            אימות דו-שלבי
          </span>
        </div>
        <div className="text-sm mb-5" style={{ color: '#98A2B3' }}>
          הזיני את הקוד בן 6 הספרות מאפליקציית ה-Authenticator שלך
        </div>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          maxLength={6}
          inputMode="numeric"
          dir="ltr"
          autoFocus
          className="w-full mb-3 text-sm rounded-md px-3 py-2 text-center tracking-widest"
          style={{ border: '1px solid #E4E7EC' }}
          placeholder="000000"
        />

        {error && (
          <div
            className="text-xs mb-3 px-3 py-2 rounded-md"
            style={{ color: '#D64545', background: '#FBEBEB' }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || code.trim().length !== 6}
          className="w-full text-sm font-medium rounded-md py-2.5 text-white"
          style={{ background: '#3949AB' }}
        >
          {loading ? 'מאמתת…' : 'אימות'}
        </button>
      </form>
    </div>
  );
}

function SupportDesk() {
  const [tickets, setTickets] = useState([]);
  const [messages, setMessages] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('inbox'); // inbox | reports
  const [queueFilter, setQueueFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState(null);
  const [tagFilter, setTagFilter] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [profileCustomerId, setProfileCustomerId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const threadEndRef = useRef(null);

  async function loadAll() {
    setLoadError('');
    const [custRes, tixRes, msgRes] = await Promise.all([
      supabase.from('customers').select('*').order('name'),
      supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true }),
    ]);
    if (custRes.error || tixRes.error || msgRes.error) {
      setLoadError((custRes.error || tixRes.error || msgRes.error).message);
    } else {
      setCustomers(custRes.data || []);
      setTickets(tixRes.data || []);
      setMessages(msgRes.data || []);
      if (!selectedId && tixRes.data && tixRes.data.length)
        setSelectedId(tixRes.data[0].id);
    }
    setLoaded(true);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // עדכונים בזמן אמת: כל שינוי שקורה אצל חברת/חבר צוות אחר משתקף כאן מיד
  useEffect(() => {
    const ticketsChannel = supabase
      .channel('tickets-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tickets' },
        (payload) => {
          setTickets((prev) =>
            prev.some((t) => t.id === payload.new.id)
              ? prev
              : [payload.new, ...prev]
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tickets' },
        (payload) => {
          setTickets((prev) =>
            prev.map((t) => (t.id === payload.new.id ? payload.new : t))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'tickets' },
        (payload) => {
          setTickets((prev) => prev.filter((t) => t.id !== payload.old.id));
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel('messages-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) =>
            prev.some((m) => m.id === payload.new.id)
              ? prev
              : [...prev, payload.new]
          );
        }
      )
      .subscribe();

    const customersChannel = supabase
      .channel('customers-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCustomers((prev) =>
              prev.some((c) => c.id === payload.new.id)
                ? prev
                : [...prev, payload.new]
            );
          } else if (payload.eventType === 'UPDATE') {
            setCustomers((prev) =>
              prev.map((c) => (c.id === payload.new.id ? payload.new : c))
            );
          } else if (payload.eventType === 'DELETE') {
            setCustomers((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(customersChannel);
    };
  }, []);

  useEffect(() => {
    if (threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [selectedId, messages]);

  const ticketMessages = useMemo(() => {
    const map = {};
    for (const m of messages) {
      if (!map[m.ticket_id]) map[m.ticket_id] = [];
      map[m.ticket_id].push(m);
    }
    return map;
  }, [messages]);

  const selected = tickets.find((t) => t.id === selectedId) || null;
  const selectedMessages = selected ? ticketMessages[selected.id] || [] : [];
  const selectedCustomer = selected
    ? customers.find((c) => c.id === selected.customer_id)
    : null;
  const profileCustomer = profileCustomerId
    ? customers.find((c) => c.id === profileCustomerId)
    : null;

  const allTags = useMemo(() => {
    const set = new Set();
    for (const t of tickets) {
      for (const tag of t.tags || []) set.add(tag);
    }
    return Array.from(set).sort();
  }, [tickets]);

  const filtered = tickets.filter((t) => {
    const c = customers.find((c) => c.id === t.customer_id);
    if (queueFilter === 'unassigned' && t.assignee) return false;
    if (queueFilter === 'mine' && t.assignee !== 'אני') return false;
    if (statusFilter && t.status !== statusFilter) return false;
    if (tagFilter && !(t.tags || []).includes(tagFilter)) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = `${t.subject} ${c ? c.name : ''} ${c ? c.company : ''} ${
        t.id
      } ${ticketNumber(t.id)}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const counts = {
    open: tickets.filter((t) => t.status === 'open' || t.status === 'new')
      .length,
    pending: tickets.filter((t) => t.status === 'pending').length,
    urgent: tickets.filter(
      (t) =>
        t.priority === 'urgent' &&
        t.status !== 'closed' &&
        t.status !== 'resolved'
    ).length,
  };

  async function updateTicket(id, patch) {
    if (patch.status) {
      // מתעדות אוטומטית מתי פנייה נסגרה, לצורך הדוח השבועי
      if (patch.status === 'resolved' || patch.status === 'closed') {
        patch = { ...patch, closed_at: new Date().toISOString() };
      } else {
        patch = { ...patch, closed_at: null };
      }
    }
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
    const { error } = await supabase.from('tickets').update(patch).eq('id', id);
    if (error) setLoadError(error.message);
  }

  async function updateCustomer(id, patch) {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
    const { error } = await supabase
      .from('customers')
      .update(patch)
      .eq('id', id);
    if (error) setLoadError(error.message);
  }

  function addTag(ticket, tag) {
    const clean = tag.trim();
    if (!clean) return;
    const current = ticket.tags || [];
    if (current.includes(clean)) return;
    updateTicket(ticket.id, { tags: [...current, clean] });
  }

  function removeTag(ticket, tag) {
    updateTicket(ticket.id, {
      tags: (ticket.tags || []).filter((t) => t !== tag),
    });
  }

  async function deleteTicket(id) {
    const next = tickets.filter((t) => t.id !== id);
    setTickets(next);
    if (selectedId === id) setSelectedId(next.length ? next[0].id : null);
    const { error } = await supabase.from('tickets').delete().eq('id', id);
    if (error) setLoadError(error.message);
  }

  async function sendReply() {
    if (!replyText.trim() || !selected) return;
    const body = replyText.trim();
    setReplyText('');
    const { data, error } = await supabase
      .from('messages')
      .insert({ ticket_id: selected.id, role: 'agent', body })
      .select()
      .single();
    if (error) {
      setLoadError(error.message);
      return;
    }
    setMessages((prev) => [...prev, data]);
    if (selected.status === 'new')
      updateTicket(selected.id, { status: 'open' });
  }

  async function createTicket(data) {
    let customer = customers.find(
      (c) =>
        c.name.trim().toLowerCase() === data.name.trim().toLowerCase() &&
        c.company.trim().toLowerCase() === data.company.trim().toLowerCase()
    );
    if (!customer) {
      const { data: newCust, error } = await supabase
        .from('customers')
        .insert({ name: data.name, company: data.company })
        .select()
        .single();
      if (error) {
        setLoadError(error.message);
        return;
      }
      customer = newCust;
      setCustomers((prev) => [...prev, customer]);
    }

    const { data: newTicket, error: tErr } = await supabase
      .from('tickets')
      .insert({
        subject: data.subject,
        customer_id: customer.id,
        status: 'new',
        priority: data.priority,
        assignee: '',
      })
      .select()
      .single();
    if (tErr) {
      setLoadError(tErr.message);
      return;
    }
    setTickets((prev) => [newTicket, ...prev]);

    if (data.body) {
      const { data: newMsg, error: mErr } = await supabase
        .from('messages')
        .insert({ ticket_id: newTicket.id, role: 'customer', body: data.body })
        .select()
        .single();
      if (!mErr) setMessages((prev) => [...prev, newMsg]);
    }

    setSelectedId(newTicket.id);
    setShowNewModal(false);
  }

  if (!loaded) {
    return (
      <div
        dir="rtl"
        style={{ ...baseFont, color: '#667085' }}
        className="flex items-center justify-center h-full w-full p-10"
      >
        טוען פניות…
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      style={{ ...baseFont, background: '#F7F8FA', color: '#1C2128' }}
      className="w-full h-full flex flex-col"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: #D9DDE3; border-radius: 4px; }
        select { -webkit-appearance: none; appearance: none; }
      `}</style>

      {loadError && (
        <div
          className="px-4 py-2 text-xs text-center"
          style={{ background: '#FBEBEB', color: '#D64545' }}
        >
          שגיאת חיבור למסד הנתונים: {loadError}
        </div>
      )}

      <div className="flex flex-1 min-h-0" style={{ minHeight: '640px' }}>
        {/* Sidebar */}
        <aside
          className="w-56 shrink-0 border-l flex flex-col"
          style={{ borderColor: '#E4E7EC', background: '#FFFFFF' }}
        >
          <div
            className="px-4 py-4 border-b flex items-center justify-between"
            style={{ borderColor: '#E4E7EC' }}
          >
            <div className="flex items-center gap-2">
              <Inbox size={18} color="#3949AB" />
              <span className="font-semibold text-base">פניות תמיכה</span>
            </div>
            <button onClick={() => supabase.auth.signOut()} title="התנתקות">
              <LogOut size={16} color="#98A2B3" />
            </button>
          </div>

          <div className="flex px-2 pt-3 gap-1">
            <button
              onClick={() => setViewMode('inbox')}
              className="flex-1 flex items-center justify-center gap-1.5 text-sm py-1.5 rounded-md"
              style={{
                background: viewMode === 'inbox' ? '#EEF0FB' : 'transparent',
                color: viewMode === 'inbox' ? '#3949AB' : '#667085',
                fontWeight: viewMode === 'inbox' ? 600 : 400,
              }}
            >
              <Inbox size={14} />
              פניות
            </button>
            <button
              onClick={() => setViewMode('reports')}
              className="flex-1 flex items-center justify-center gap-1.5 text-sm py-1.5 rounded-md"
              style={{
                background: viewMode === 'reports' ? '#EEF0FB' : 'transparent',
                color: viewMode === 'reports' ? '#3949AB' : '#667085',
                fontWeight: viewMode === 'reports' ? 600 : 400,
              }}
            >
              <BarChart3 size={14} />
              דוחות
            </button>
          </div>

          {viewMode === 'inbox' && (
            <>
              <nav className="px-2 py-3">
                {[
                  { key: 'all', label: 'הכל' },
                  { key: 'unassigned', label: 'לא משויך' },
                  { key: 'mine', label: 'שלי' },
                ].map((q) => (
                  <button
                    key={q.key}
                    onClick={() => setQueueFilter(q.key)}
                    className="w-full text-right px-3 py-2 rounded text-sm mb-1 transition-colors"
                    style={{
                      background:
                        queueFilter === q.key ? '#EEF0FB' : 'transparent',
                      color: queueFilter === q.key ? '#3949AB' : '#475467',
                      fontWeight: queueFilter === q.key ? 600 : 400,
                    }}
                  >
                    {q.label}
                  </button>
                ))}
              </nav>

              <div
                className="px-4 pt-2 pb-1 text-xs font-medium"
                style={{ color: '#98A2B3' }}
              >
                סטטוס
              </div>
              <nav className="px-2 pb-4">
                <button
                  onClick={() => setStatusFilter(null)}
                  className="w-full flex items-center justify-between text-right px-3 py-1.5 rounded text-sm mb-0.5"
                  style={{
                    background:
                      statusFilter === null ? '#EEF0FB' : 'transparent',
                    color: statusFilter === null ? '#3949AB' : '#475467',
                  }}
                >
                  <span>כל הסטטוסים</span>
                </button>
                {STATUS_ORDER.map((key) => {
                  const count = tickets.filter((t) => t.status === key).length;
                  const s = STATUS[key];
                  return (
                    <button
                      key={key}
                      onClick={() => setStatusFilter(key)}
                      className="w-full flex items-center justify-between text-right px-3 py-1.5 rounded text-sm mb-0.5"
                      style={{
                        background:
                          statusFilter === key ? '#EEF0FB' : 'transparent',
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: 999,
                            background: s.color,
                            display: 'inline-block',
                          }}
                        />
                        <span
                          style={{
                            color: statusFilter === key ? '#3949AB' : '#475467',
                          }}
                        >
                          {s.label}
                        </span>
                      </span>
                      <span style={{ color: '#98A2B3', fontSize: 12 }}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </nav>

              {allTags.length > 0 && (
                <>
                  <div
                    className="px-4 pt-1 pb-1 text-xs font-medium"
                    style={{ color: '#98A2B3' }}
                  >
                    תגיות
                  </div>
                  <nav
                    className="px-2 pb-2 overflow-y-auto"
                    style={{ maxHeight: 120 }}
                  >
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() =>
                          setTagFilter(tagFilter === tag ? null : tag)
                        }
                        className="w-full text-right px-3 py-1.5 rounded text-sm mb-0.5"
                        style={{
                          background:
                            tagFilter === tag ? '#EEF0FB' : 'transparent',
                          color: tagFilter === tag ? '#3949AB' : '#475467',
                        }}
                      >
                        #{tag}
                      </button>
                    ))}
                  </nav>
                </>
              )}
            </>
          )}

          <div
            className="mt-auto px-2 pb-3 pt-2 border-t"
            style={{ borderColor: '#E4E7EC' }}
          >
            <button
              onClick={() => setShowResetModal(true)}
              className="w-full flex items-center gap-2 text-right px-3 py-2 rounded text-sm"
              style={{ color: '#667085' }}
            >
              <ShieldAlert size={15} />
              איפוס MFA
            </button>
          </div>
        </aside>

        {/* Ticket list */}
        {viewMode === 'inbox' && (
          <>
            <section
              className="w-[340px] shrink-0 border-l flex flex-col min-h-0"
              style={{ borderColor: '#E4E7EC', background: '#FCFCFD' }}
            >
              <div
                className="p-3 border-b flex items-center gap-2"
                style={{ borderColor: '#E4E7EC' }}
              >
                <div className="flex-1 relative">
                  <Search
                    size={15}
                    color="#98A2B3"
                    style={{ position: 'absolute', right: 10, top: 10 }}
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="חיפוש לפי מספר פנייה, נושא, לקוח או חברה"
                    className="w-full text-sm rounded-md py-2 pr-8 pl-3 outline-none"
                    style={{
                      border: '1px solid #E4E7EC',
                      background: '#FFFFFF',
                    }}
                  />
                </div>
                <button
                  onClick={() => setShowNewModal(true)}
                  className="flex items-center gap-1 text-sm font-medium rounded-md px-3 py-2 text-white shrink-0"
                  style={{ background: '#3949AB' }}
                >
                  <Plus size={15} />
                  חדשה
                </button>
              </div>

              <div
                className="grid grid-cols-3 gap-2 px-3 py-2 border-b"
                style={{ borderColor: '#E4E7EC' }}
              >
                <div
                  className="rounded-md px-2 py-1.5"
                  style={{ background: '#EAF1FD' }}
                >
                  <div className="text-[11px]" style={{ color: '#2F6FE4' }}>
                    פתוחות
                  </div>
                  <div
                    className="text-base font-semibold"
                    style={{ color: '#1C2128' }}
                  >
                    {counts.open}
                  </div>
                </div>
                <div
                  className="rounded-md px-2 py-1.5"
                  style={{ background: '#FBF1E1' }}
                >
                  <div className="text-[11px]" style={{ color: '#B7791F' }}>
                    ממתינות
                  </div>
                  <div
                    className="text-base font-semibold"
                    style={{ color: '#1C2128' }}
                  >
                    {counts.pending}
                  </div>
                </div>
                <div
                  className="rounded-md px-2 py-1.5"
                  style={{ background: '#FBEBEB' }}
                >
                  <div className="text-[11px]" style={{ color: '#D64545' }}>
                    דחופות
                  </div>
                  <div
                    className="text-base font-semibold"
                    style={{ color: '#1C2128' }}
                  >
                    {counts.urgent}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 && (
                  <div
                    className="text-sm text-center py-10 px-4"
                    style={{ color: '#98A2B3' }}
                  >
                    אין פניות שתואמות לסינון הנוכחי
                  </div>
                )}
                {filtered.map((t) => {
                  const c = customers.find((c) => c.id === t.customer_id);
                  const s = STATUS[t.status];
                  const p = PRIORITY[t.priority];
                  const active = t.id === selectedId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedId(t.id)}
                      className="w-full text-right px-3 py-3 border-b block"
                      style={{
                        borderColor: '#EEF0F2',
                        background: active ? '#EEF0FB' : 'transparent',
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ color: '#B7791F', background: '#FBF1E1' }}
                          >
                            {ticketNumber(t.id)}
                          </span>
                          <span
                            className="text-xs font-medium px-1.5 py-0.5 rounded"
                            style={{ color: s.color, background: s.bg }}
                          >
                            {s.label}
                          </span>
                        </div>
                        <span
                          className="text-[11px]"
                          style={{ color: '#98A2B3' }}
                        >
                          {timeAgo(t.created_at)}
                        </span>
                      </div>
                      <div
                        className="text-sm font-medium mb-0.5 line-clamp-1"
                        style={{ color: '#1C2128' }}
                      >
                        {t.subject}
                      </div>
                      <div
                        className="text-xs mb-1"
                        style={{ color: '#667085' }}
                      >
                        {c ? c.name : 'לקוח לא ידוע'} · {c ? c.company : ''}
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 999,
                            background: p.color,
                            display: 'inline-block',
                          }}
                        />
                        <span
                          className="text-[11px]"
                          style={{ color: p.color }}
                        >
                          {p.label}
                        </span>
                        {t.assignee && (
                          <span
                            className="text-[11px] mr-auto"
                            style={{ color: '#98A2B3' }}
                          >
                            {t.assignee}
                          </span>
                        )}
                      </div>
                      {t.tags && t.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {t.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{
                                background: '#F0F1F3',
                                color: '#667085',
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Detail panel */}
            <section
              className="flex-1 flex flex-col min-h-0"
              style={{ background: '#F7F8FA' }}
            >
              {!selected ? (
                <div
                  className="flex-1 flex items-center justify-center text-sm"
                  style={{ color: '#98A2B3' }}
                >
                  בחרי פנייה כדי לצפות בפרטים
                </div>
              ) : (
                <>
                  <div
                    className="px-6 py-4 border-b"
                    style={{ borderColor: '#E4E7EC', background: '#FFFFFF' }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div
                          className="text-[12px] mb-1"
                          style={{ color: '#98A2B3' }}
                        >
                          {ticketNumber(selected.id)}
                        </div>
                        <h2
                          className="text-lg font-semibold"
                          style={{ color: '#1C2128' }}
                        >
                          {selected.subject}
                        </h2>
                        {selectedCustomer && (
                          <button
                            onClick={() =>
                              setProfileCustomerId(selectedCustomer.id)
                            }
                            className="flex items-center gap-2 mt-2 rounded-md pl-2 pr-1 py-1 -mr-1"
                            style={{ transition: 'background 0.15s' }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = '#F2F3F7')
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = 'transparent')
                            }
                          >
                            <span
                              className="flex items-center justify-center rounded-full text-white text-[11px] font-semibold shrink-0"
                              style={{
                                width: 26,
                                height: 26,
                                background: avatarColor(selectedCustomer.id),
                              }}
                            >
                              {initials(selectedCustomer.name)}
                            </span>
                            <span className="text-sm text-right">
                              <span
                                style={{ color: '#1C2128', fontWeight: 500 }}
                              >
                                {selectedCustomer.name}
                              </span>
                              <span style={{ color: '#98A2B3' }}>
                                {' '}
                                · {selectedCustomer.company}
                              </span>
                            </span>
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => deleteTicket(selected.id)}
                        className="flex items-center gap-1 text-xs px-2 py-1.5 rounded shrink-0"
                        style={{ color: '#D64545' }}
                        title="מחיקת פנייה"
                      >
                        <Trash2 size={14} />
                        מחיקה
                      </button>
                    </div>

                    <div className="flex items-center gap-3 mt-4">
                      <label className="text-xs" style={{ color: '#98A2B3' }}>
                        סטטוס
                        <select
                          value={selected.status}
                          onChange={(e) =>
                            updateTicket(selected.id, {
                              status: e.target.value,
                            })
                          }
                          className="block mt-1 text-sm rounded-md px-2 py-1.5"
                          style={{
                            border: '1px solid #E4E7EC',
                            color: STATUS[selected.status].color,
                            fontWeight: 600,
                          }}
                        >
                          {STATUS_ORDER.map((k) => (
                            <option key={k} value={k}>
                              {STATUS[k].label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="text-xs" style={{ color: '#98A2B3' }}>
                        עדיפות
                        <select
                          value={selected.priority}
                          onChange={(e) =>
                            updateTicket(selected.id, {
                              priority: e.target.value,
                            })
                          }
                          className="block mt-1 text-sm rounded-md px-2 py-1.5"
                          style={{
                            border: '1px solid #E4E7EC',
                            color: PRIORITY[selected.priority].color,
                            fontWeight: 600,
                          }}
                        >
                          {Object.keys(PRIORITY).map((k) => (
                            <option key={k} value={k}>
                              {PRIORITY[k].label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="text-xs" style={{ color: '#98A2B3' }}>
                        מוקצה ל
                        <input
                          value={selected.assignee || ''}
                          onChange={(e) =>
                            updateTicket(selected.id, {
                              assignee: e.target.value,
                            })
                          }
                          placeholder="לא מוקצה"
                          className="block mt-1 text-sm rounded-md px-2 py-1.5 w-28"
                          style={{ border: '1px solid #E4E7EC' }}
                        />
                      </label>
                    </div>

                    <SystemTagPicker onAdd={(tag) => addTag(selected, tag)} />
                    <TicketTagsEditor
                      ticket={selected}
                      onAdd={(tag) => addTag(selected, tag)}
                      onRemove={(tag) => removeTag(selected, tag)}
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
                    {selectedMessages.length === 0 && (
                      <div
                        className="text-sm text-center py-8"
                        style={{ color: '#98A2B3' }}
                      >
                        אין הודעות עדיין בפנייה זו
                      </div>
                    )}
                    {selectedMessages.map((m) => {
                      const isAgent = m.role === 'agent';
                      return (
                        <div
                          key={m.id}
                          className="flex items-end gap-2"
                          style={{
                            flexDirection: isAgent ? 'row' : 'row-reverse',
                          }}
                        >
                          <span
                            className="flex items-center justify-center rounded-full text-white text-[10px] font-semibold shrink-0"
                            style={{
                              width: 24,
                              height: 24,
                              background: isAgent
                                ? '#3949AB'
                                : avatarColor(
                                    selectedCustomer ? selectedCustomer.id : 'x'
                                  ),
                            }}
                          >
                            {isAgent
                              ? 'את'
                              : initials(
                                  selectedCustomer ? selectedCustomer.name : ''
                                )}
                          </span>
                          <div
                            className="max-w-[60%] rounded-xl px-3.5 py-2.5"
                            style={{
                              background: isAgent ? '#3949AB' : '#FFFFFF',
                              color: isAgent ? '#FFFFFF' : '#1C2128',
                              border: isAgent ? 'none' : '1px solid #E4E7EC',
                            }}
                          >
                            <div
                              className="text-sm leading-relaxed"
                              style={{ whiteSpace: 'pre-wrap' }}
                            >
                              {m.body}
                            </div>
                            <div
                              className="text-[10px] mt-1"
                              style={{
                                color: isAgent
                                  ? 'rgba(255,255,255,0.7)'
                                  : '#98A2B3',
                              }}
                            >
                              {timeAgo(m.created_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={threadEndRef} />
                  </div>

                  <div
                    className="px-6 py-4 border-t"
                    style={{ borderColor: '#E4E7EC', background: '#FFFFFF' }}
                  >
                    <div className="flex items-end gap-2">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendReply();
                          }
                        }}
                        placeholder="כתבי תגובה ללקוח…"
                        rows={2}
                        className="flex-1 text-sm rounded-md px-3 py-2 outline-none resize-none"
                        style={{ border: '1px solid #E4E7EC' }}
                      />
                      <button
                        onClick={sendReply}
                        disabled={!replyText.trim()}
                        className="flex items-center gap-1 text-sm font-medium rounded-md px-4 py-2.5 text-white shrink-0"
                        style={{
                          background: replyText.trim() ? '#3949AB' : '#C3CAE0',
                        }}
                      >
                        <Send size={14} />
                        שליחה
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
          </>
        )}
        {viewMode === 'reports' && <ReportsView tickets={tickets} />}
      </div>

      {showNewModal && (
        <NewTicketModal
          onClose={() => setShowNewModal(false)}
          onCreate={createTicket}
        />
      )}
      {profileCustomer && (
        <CustomerProfileModal
          customer={profileCustomer}
          tickets={tickets.filter((t) => t.customer_id === profileCustomer.id)}
          onClose={() => setProfileCustomerId(null)}
          onSave={(patch) => updateCustomer(profileCustomer.id, patch)}
          onSelectTicket={(id) => {
            setSelectedId(id);
            setProfileCustomerId(null);
          }}
        />
      )}
      {showResetModal && (
        <AdminResetModal onClose={() => setShowResetModal(false)} />
      )}
    </div>
  );
}

function AdminResetModal({ onClose }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message }
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('quick-responder', {
      body: { email: email.trim() },
    });
    setLoading(false);
    if (error) {
      setStatus({
        type: 'error',
        message: 'שגיאה בקריאה לשרת: ' + error.message,
      });
    } else if (data?.error) {
      setStatus({ type: 'error', message: data.error });
    } else {
      setStatus({
        type: 'success',
        message: `האימות הדו-שלבי אופס. ${email} יתבקש/תתבקש להירשם מחדש בכניסה הבאה שלו/ה.`,
      });
      setEmail('');
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: 'rgba(28,33,40,0.45)' }}
      onClick={onClose}
    >
      <form
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl p-5"
        style={{ background: '#FFFFFF', ...baseFont }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} color="#3949AB" />
            <h3
              className="text-base font-semibold"
              style={{ color: '#1C2128' }}
            >
              איפוס MFA למשתמש
            </h3>
          </div>
          <button type="button" onClick={onClose}>
            <X size={18} color="#98A2B3" />
          </button>
        </div>
        <div className="text-xs mb-4" style={{ color: '#98A2B3' }}>
          זמין רק למנהלים מורשים. הזיני את האימייל של איש/אשת הצוות שנעל/ה מחוץ
          למערכת.
        </div>

        <label className="text-xs" style={{ color: '#667085' }}>
          אימייל המשתמש
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full mt-1 mb-3 text-sm rounded-md px-3 py-2"
          style={{ border: '1px solid #E4E7EC' }}
          placeholder="name@company.com"
        />

        {status && (
          <div
            className="text-xs mb-3 px-3 py-2 rounded-md"
            style={{
              color: status.type === 'success' ? '#1F9254' : '#D64545',
              background: status.type === 'success' ? '#E7F6EE' : '#FBEBEB',
            }}
          >
            {status.message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="w-full text-sm font-medium rounded-md py-2.5 text-white"
          style={{ background: '#3949AB' }}
        >
          {loading ? 'מאפסת…' : 'איפוס MFA'}
        </button>
      </form>
    </div>
  );
}

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // יום ראשון כתחילת שבוע
  return d;
}

function weekLabel(date) {
  return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
}

function ReportsView({ tickets }) {
  const now = new Date();
  const thisWeekStart = startOfWeek(now);

  const openedThisWeek = tickets.filter(
    (t) => new Date(t.created_at) >= thisWeekStart
  ).length;
  const closedThisWeek = tickets.filter(
    (t) => t.closed_at && new Date(t.closed_at) >= thisWeekStart
  ).length;
  const stillOpen = tickets.filter(
    (t) => t.status !== 'resolved' && t.status !== 'closed'
  ).length;

  // 8 השבועות האחרונים, לצורך מגמה
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const start = new Date(thisWeekStart);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const opened = tickets.filter((t) => {
      const d = new Date(t.created_at);
      return d >= start && d < end;
    }).length;
    const closed = tickets.filter((t) => {
      if (!t.closed_at) return false;
      const d = new Date(t.closed_at);
      return d >= start && d < end;
    }).length;
    weeks.push({ start, opened, closed });
  }
  const maxCount = Math.max(
    1,
    ...weeks.map((w) => Math.max(w.opened, w.closed))
  );

  return (
    <div
      dir="rtl"
      className="flex-1 overflow-y-auto p-6"
      style={{ background: '#F7F8FA' }}
    >
      <h2 className="text-lg font-semibold mb-4" style={{ color: '#1C2128' }}>
        דוח שבועי
      </h2>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div
          className="rounded-lg p-4"
          style={{ background: '#FFFFFF', border: '1px solid #E4E7EC' }}
        >
          <div className="text-xs mb-1" style={{ color: '#98A2B3' }}>
            נפתחו השבוע
          </div>
          <div className="text-2xl font-semibold" style={{ color: '#2F6FE4' }}>
            {openedThisWeek}
          </div>
        </div>
        <div
          className="rounded-lg p-4"
          style={{ background: '#FFFFFF', border: '1px solid #E4E7EC' }}
        >
          <div className="text-xs mb-1" style={{ color: '#98A2B3' }}>
            נסגרו השבוע
          </div>
          <div className="text-2xl font-semibold" style={{ color: '#1F9254' }}>
            {closedThisWeek}
          </div>
        </div>
        <div
          className="rounded-lg p-4"
          style={{ background: '#FFFFFF', border: '1px solid #E4E7EC' }}
        >
          <div className="text-xs mb-1" style={{ color: '#98A2B3' }}>
            פתוחות כרגע (סה"כ)
          </div>
          <div className="text-2xl font-semibold" style={{ color: '#B7791F' }}>
            {stillOpen}
          </div>
        </div>
      </div>

      <div
        className="rounded-lg p-4 mb-6"
        style={{ background: '#FFFFFF', border: '1px solid #E4E7EC' }}
      >
        <div className="text-sm font-medium mb-4" style={{ color: '#1C2128' }}>
          מגמה — 8 שבועות אחרונים
        </div>
        <div className="flex items-end gap-3" style={{ height: 140 }}>
          {weeks.map((w, i) => (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end h-full"
            >
              <div className="flex items-end gap-1" style={{ height: '100%' }}>
                <div
                  title={`נפתחו: ${w.opened}`}
                  style={{
                    width: 10,
                    height: `${(w.opened / maxCount) * 100}%`,
                    background: '#2F6FE4',
                    borderRadius: 2,
                    minHeight: w.opened > 0 ? 3 : 0,
                  }}
                />
                <div
                  title={`נסגרו: ${w.closed}`}
                  style={{
                    width: 10,
                    height: `${(w.closed / maxCount) * 100}%`,
                    background: '#1F9254',
                    borderRadius: 2,
                    minHeight: w.closed > 0 ? 3 : 0,
                  }}
                />
              </div>
              <div className="text-[10px] mt-1.5" style={{ color: '#98A2B3' }}>
                {weekLabel(w.start)}
              </div>
            </div>
          ))}
        </div>
        <div
          className="flex items-center gap-4 mt-4 text-xs"
          style={{ color: '#667085' }}
        >
          <span className="flex items-center gap-1.5">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: '#2F6FE4',
                display: 'inline-block',
              }}
            />
            נפתחו
          </span>
          <span className="flex items-center gap-1.5">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: '#1F9254',
                display: 'inline-block',
              }}
            />
            נסגרו
          </span>
        </div>
      </div>

      <div
        className="rounded-lg p-4"
        style={{ background: '#FFFFFF', border: '1px solid #E4E7EC' }}
      >
        <div className="text-sm font-medium mb-3" style={{ color: '#1C2128' }}>
          לפי סטטוס (מצב נוכחי)
        </div>
        <div className="space-y-2">
          {STATUS_ORDER.map((key) => {
            const s = STATUS[key];
            const count = tickets.filter((t) => t.status === key).length;
            const pct = tickets.length
              ? Math.round((count / tickets.length) * 100)
              : 0;
            return (
              <div key={key} className="flex items-center gap-3">
                <span
                  className="text-xs w-16 shrink-0"
                  style={{ color: s.color }}
                >
                  {s.label}
                </span>
                <div
                  className="flex-1 rounded-full overflow-hidden"
                  style={{ background: '#F0F1F3', height: 8 }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: s.color,
                    }}
                  />
                </div>
                <span
                  className="text-xs w-8 text-left shrink-0"
                  style={{ color: '#98A2B3' }}
                >
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SystemTagPicker({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set());
  const [query, setQuery] = useState('');
  const boxRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function toggleExpand(path) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function handleSelect(ancestorNames, node) {
    for (const name of [...ancestorNames, node.name]) onAdd(name);
    setOpen(false);
    setQuery('');
  }

  // מסננת את העץ לפי החיפוש, ומרחיבה אוטומטית ענפים עם התאמה
  function filterTree(nodes, q) {
    if (!q.trim()) return nodes;
    const lower = q.trim().toLowerCase();
    const walk = (list) =>
      list
        .map((n) => {
          const selfMatch = n.name.toLowerCase().includes(lower);
          const filteredChildren = n.children ? walk(n.children) : null;
          if (selfMatch || (filteredChildren && filteredChildren.length > 0)) {
            return { ...n, children: filteredChildren };
          }
          return null;
        })
        .filter(Boolean);
    return walk(nodes);
  }

  const visibleTree = filterTree(TAG_TREE, query);

  function renderNode(node, ancestorNames, path, depth) {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = query.trim() ? true : expanded.has(path);
    return (
      <div key={path}>
        <div
          className="flex items-center gap-1 py-1 rounded"
          style={{ paddingRight: depth * 14 }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#F2F3F7')}
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = 'transparent')
          }
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleExpand(path)}
              className="shrink-0"
              style={{ color: '#98A2B3' }}
            >
              {isExpanded ? (
                <ChevronDown size={13} />
              ) : (
                <ChevronRight size={13} />
              )}
            </button>
          ) : (
            <span className="shrink-0" style={{ width: 13 }} />
          )}
          <button
            type="button"
            onClick={() => handleSelect(ancestorNames, node)}
            className="text-sm text-right flex-1 py-0.5"
            style={{ color: depth === 0 ? '#1C2128' : '#3949AB' }}
          >
            {node.name}
          </button>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child, i) =>
              renderNode(
                child,
                [...ancestorNames, node.name],
                `${path}/${i}`,
                depth + 1
              )
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative mt-3" ref={boxRef}>
      <label className="text-xs block mb-1" style={{ color: '#98A2B3' }}>
        מערכת קשורה
      </label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm rounded-md px-3 py-1.5"
        style={{ border: '1px solid #E4E7EC', color: '#475467' }}
      >
        <Layers size={13} />
        בחרי מערכת / קטגוריה
      </button>

      {open && (
        <div
          className="absolute z-30 mt-1 rounded-lg overflow-hidden"
          style={{
            width: 280,
            background: '#FFFFFF',
            border: '1px solid #E4E7EC',
            boxShadow: '0 8px 24px rgba(16,24,40,0.12)',
          }}
        >
          <div
            className="px-2 py-2 border-b"
            style={{ borderColor: '#E4E7EC' }}
          >
            <div className="relative">
              <Search
                size={13}
                color="#98A2B3"
                style={{ position: 'absolute', right: 8, top: 8 }}
              />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="חיפוש"
                className="w-full text-xs rounded-md py-1.5 pr-7 pl-2 outline-none"
                style={{ border: '1px solid #E4E7EC' }}
              />
            </div>
          </div>
          <div className="px-2 py-2 overflow-y-auto" style={{ maxHeight: 280 }}>
            <div
              className="text-[11px] font-medium px-1 pb-1"
              style={{ color: '#98A2B3' }}
            >
              {TAG_TREE_LABEL}
            </div>
            {visibleTree.length === 0 ? (
              <div
                className="text-xs text-center py-4"
                style={{ color: '#98A2B3' }}
              >
                אין תוצאות
              </div>
            ) : (
              visibleTree.map((node, i) => renderNode(node, [], `${i}`, 0))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TicketTagsEditor({ ticket, onAdd, onRemove }) {
  const [value, setValue] = useState('');

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onAdd(value);
      setValue('');
    }
  }

  return (
    <div className="flex items-center flex-wrap gap-1.5 mt-3">
      {(ticket.tags || []).map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full"
          style={{ background: '#F0F1F3', color: '#475467' }}
        >
          #{tag}
          <button onClick={() => onRemove(tag)} style={{ color: '#98A2B3' }}>
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="+ הוספת תגית"
        className="text-[11px] px-2 py-1 rounded-full outline-none"
        style={{ border: '1px dashed #D0D5DD', width: 100 }}
      />
    </div>
  );
}

function CustomerProfileModal({
  customer,
  tickets,
  onClose,
  onSave,
  onSelectTicket,
}) {
  const [form, setForm] = useState({
    name: customer.name,
    company: customer.company,
    phone: customer.phone,
    email: customer.email,
    role: customer.role,
    notes: customer.notes,
  });

  function field(key, label, Icon, placeholder) {
    return (
      <div>
        <label
          className="text-xs flex items-center gap-1.5"
          style={{ color: '#667085' }}
        >
          <Icon size={12} />
          {label}
        </label>
        <input
          value={form[key] || ''}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          onBlur={() => onSave(form)}
          placeholder={placeholder}
          className="w-full mt-1 text-sm rounded-md px-3 py-2"
          style={{ border: '1px solid #E4E7EC' }}
        />
      </div>
    );
  }

  const oldest = tickets.reduce(
    (min, t) => (t.created_at < min ? t.created_at : min),
    tickets[0]?.created_at || new Date().toISOString()
  );

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: 'rgba(28,33,40,0.45)' }}
      onClick={onClose}
    >
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl overflow-hidden"
        style={{
          background: '#FFFFFF',
          ...baseFont,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          className="px-5 pt-5 pb-4 border-b"
          style={{ borderColor: '#E4E7EC' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span
                className="flex items-center justify-center rounded-full text-white text-sm font-semibold"
                style={{
                  width: 40,
                  height: 40,
                  background: avatarColor(customer.id),
                }}
              >
                {initials(form.name)}
              </span>
              <div>
                <div
                  className="text-base font-semibold"
                  style={{ color: '#1C2128' }}
                >
                  {form.name}
                </div>
                <div className="text-xs" style={{ color: '#98A2B3' }}>
                  {form.company}
                </div>
              </div>
            </div>
            <button onClick={onClose}>
              <X size={18} color="#98A2B3" />
            </button>
          </div>
          <div
            className="flex items-center gap-1 text-xs"
            style={{ color: '#98A2B3' }}
          >
            <Clock size={12} />
            לקוח מאז {fullDate(oldest)} · {tickets.length} פניות בסה"כ
          </div>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            {field('name', 'שם מלא', UserCircle2, '')}
            {field('company', 'חברה', Briefcase, '')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field('phone', 'טלפון', Phone, '050-0000000')}
            {field('email', 'אימייל', Mail, 'name@company.com')}
          </div>
          {field('role', 'תפקיד', Briefcase, 'לדוגמה: מנהל/ת מוצר')}
          <div>
            <label className="text-xs" style={{ color: '#667085' }}>
              הערות פנימיות
            </label>
            <textarea
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              onBlur={() => onSave(form)}
              rows={3}
              placeholder="פרטים נוספים על הלקוח, העדפות תקשורת וכו׳"
              className="w-full mt-1 text-sm rounded-md px-3 py-2 resize-none"
              style={{ border: '1px solid #E4E7EC' }}
            />
          </div>

          {tickets.length > 0 && (
            <div>
              <div className="text-xs mb-2" style={{ color: '#667085' }}>
                פניות מהלקוח
              </div>
              <div className="space-y-1.5">
                {tickets.map((t) => {
                  const s = STATUS[t.status];
                  return (
                    <button
                      key={t.id}
                      onClick={() => onSelectTicket(t.id)}
                      className="w-full flex items-center justify-between text-right px-2.5 py-2 rounded-md"
                      style={{ border: '1px solid #E4E7EC' }}
                    >
                      <span
                        className="text-sm truncate"
                        style={{ color: '#1C2128' }}
                      >
                        {t.subject}
                      </span>
                      <span
                        className="text-[11px] px-1.5 py-0.5 rounded shrink-0 mr-2"
                        style={{ color: s.color, background: s.bg }}
                      >
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NewTicketModal({ onClose, onCreate }) {
  const [subject, setSubject] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [priority, setPriority] = useState('normal');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = subject.trim() && name.trim() && !submitting;

  async function handleCreate() {
    if (!canSubmit) return;
    setSubmitting(true);
    await onCreate({ subject, name, company, priority, body });
    setSubmitting(false);
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: 'rgba(28,33,40,0.45)' }}
      onClick={onClose}
    >
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl p-5"
        style={{ background: '#FFFFFF', ...baseFont }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold" style={{ color: '#1C2128' }}>
            פנייה חדשה
          </h3>
          <button onClick={onClose}>
            <X size={18} color="#98A2B3" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs" style={{ color: '#667085' }}>
              נושא הפנייה
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full mt-1 text-sm rounded-md px-3 py-2"
              style={{ border: '1px solid #E4E7EC' }}
              placeholder="לדוגמה: לא מצליח להתחבר"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs" style={{ color: '#667085' }}>
                שם הלקוח
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full mt-1 text-sm rounded-md px-3 py-2"
                style={{ border: '1px solid #E4E7EC' }}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: '#667085' }}>
                חברה
              </label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full mt-1 text-sm rounded-md px-3 py-2"
                style={{ border: '1px solid #E4E7EC' }}
              />
            </div>
          </div>
          <div>
            <label className="text-xs" style={{ color: '#667085' }}>
              עדיפות
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full mt-1 text-sm rounded-md px-3 py-2"
              style={{ border: '1px solid #E4E7EC' }}
            >
              {Object.keys(PRIORITY).map((k) => (
                <option key={k} value={k}>
                  {PRIORITY[k].label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs" style={{ color: '#667085' }}>
              תיאור ראשוני (אופציונלי)
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              className="w-full mt-1 text-sm rounded-md px-3 py-2 resize-none"
              style={{ border: '1px solid #E4E7EC' }}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="text-sm px-3 py-2 rounded-md"
            style={{ color: '#667085' }}
          >
            ביטול
          </button>
          <button
            disabled={!canSubmit}
            onClick={handleCreate}
            className="text-sm font-medium px-4 py-2 rounded-md text-white"
            style={{ background: canSubmit ? '#3949AB' : '#C3CAE0' }}
          >
            {submitting ? 'יוצרת…' : 'יצירת פנייה'}
          </button>
        </div>
      </div>
    </div>
  );
}
