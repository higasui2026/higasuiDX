/**
 * 東大阪吹奏楽団 DXシステム
 * Supabase クライアント設定
 *
 * ⚠️  本番利用前に以下を設定してください:
 *   1. Supabaseプロジェクトを作成 (https://supabase.com)
 *   2. SUPABASE_URL と SUPABASE_ANON_KEY を実際の値に書き換える
 *
 * セキュリティ注意事項:
 *   - anon key はフロントエンドから安全に使用可能（Row Level Security で保護）
 *   - service_role key は絶対にリポジトリにコミットしない
 *   - Supabaseダッシュボードで Row Level Security (RLS) を必ず有効にすること
 */

// ── 設定値（本番前にここを変更） ──
const SUPABASE_CONFIG = {
  url:     'https://wfsbrtrjsqmivbzobznc.supabase.co',      
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indmc2JydHJqc3FtaXZiem9iem5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMDA3ODYsImV4cCI6MjA5Mzc3Njc4Nn0.3c6gYwo5udgcCQu7yL3Q0UC83Z21mFW3LWtizuFy5HI', 
};

// ── Supabaseクライアント ──
// window.supabase はSDKが注入するグローバル変数のため、
// 競合を避けるため別名 _sb で管理する
let _sb = null;

function initSupabase() {
  if (typeof window.supabase === 'undefined') {
    console.warn('Supabase SDK が読み込まれていません。');
    return null;
  }
  if (SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL') {
    console.warn('Supabase設定が未完了です。js/supabase.js を編集してください。');
    return null;
  }
  _sb = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  return _sb;
}

// ── 認証ヘルパー ──
const Auth = {
  async signIn(email, password) {
    if (!_sb) return { error: { message: 'Supabase未接続' } };
    const { data, error } = await _sb.auth.signInWithPassword({ email, password });
    if (data?.user) {
      const profile = await DB.profiles.get(data.user.id);
      if (profile) {
        sessionStorage.setItem('hs_user', JSON.stringify({
          id:   profile.id,
          name: `${profile.last_name}${profile.first_name}`,
          role: profile.role,
          part: profile.part,
        }));
      }
    }
    return { data, error };
  },

  async signOut() {
    if (_sb) await _sb.auth.signOut();
    sessionStorage.removeItem('hs_user');
    const isRoot = !window.location.pathname.includes('/pages/');
    window.location.href = isRoot ? 'pages/auth/login.html' : '../pages/auth/login.html';
  },

  async getSession() {
    if (!_sb) return null;
    const { data } = await _sb.auth.getSession();
    return data?.session ?? null;
  },

  async requireAuth() {
    const session = await Auth.getSession();
    if (!session) {
      const isRoot = !window.location.pathname.includes('/pages/');
      window.location.href = isRoot ? 'pages/auth/login.html' : '../pages/auth/login.html';
      return false;
    }
    return true;
  },
};

// ── DBヘルパー ──
const DB = {
  profiles: {
    async get(userId) {
      if (!_sb) return null;
      const { data } = await _sb.from('profiles').select('*').eq('id', userId).single();
      return data;
    },
    async list() {
      if (!_sb) return [];
      const { data } = await _sb.from('profiles').select('*').order('part').order('last_name');
      return data ?? [];
    },
  },
  scores: {
    async list() {
      if (!_sb) return [];
      const { data } = await _sb.from('scores').select('*').order('title');
      return data ?? [];
    },
    async get(id) {
      if (!_sb) return null;
      const { data } = await _sb.from('scores').select('*').eq('id', id).single();
      return data;
    },
  },
  ledger: {
    async list(year) {
      if (!_sb) return [];
      let q = _sb.from('ledger_entries').select('*').order('date', { ascending: false });
      if (year) q = q.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`);
      const { data } = await q;
      return data ?? [];
    },
  },
  instruments: {
    async list() {
      if (!_sb) return [];
      const { data } = await _sb.from('instruments').select('*').order('instrument_number');
      return data ?? [];
    },
    async findByQR(code) {
      if (!_sb) return null;
      const { data } = await _sb.from('instruments').select('*').eq('instrument_number', code).single();
      return data;
    },
  },
};

// ── 初期化 ──
document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
});
