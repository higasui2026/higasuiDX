/**
 * 東大阪吹奏楽団 DXシステム
 * Supabase クライアント設定
 *
 * ⚠️  本番利用前に以下を設定してください:
 *   1. Supabaseプロジェクトを作成 (https://supabase.com)
 *   2. SUPABASE_URL と SUPABASE_ANON_KEY を実際の値に書き換える
 *   3. GitHubリポジトリに秘密鍵は含めず、GitHubActionsのSecretsを活用すること
 *
 * セキュリティ注意事項:
 *   - anon key はフロントエンドから安全に使用可能（Row Level Security で保護）
 *   - service_role key は絶対に公開リポジトリにコミットしない
 *   - Supabaseダッシュボードで Row Level Security (RLS) を必ず有効にすること
 */

// ── 設定値（開発時はここを変更） ──
const SUPABASE_CONFIG = {
  url:     'https://wfsbrtrjsqmivbzobznc.supabase.co',      // 例: https://xxxx.supabase.co
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indmc2JydHJqc3FtaXZiem9iem5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMDA3ODYsImV4cCI6MjA5Mzc3Njc4Nn0.3c6gYwo5udgcCQu7yL3Q0UC83Z21mFW3LWtizuFy5HI', // 例: eyJhbGciOiJIUzI1Ni...
};

// ── Supabaseクライアント初期化 ──
let supabase = null;

async function initSupabase() {
  if (typeof window.supabase === 'undefined') {
    console.warn('Supabase SDK が読み込まれていません。CDNリンクを確認してください。');
    return null;
  }

  if (SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL') {
    console.warn('Supabase設定が未完了です。config/supabase.js を編集してください。');
    return null;
  }

  supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  return supabase;
}

// ── 認証ヘルパー ──
const Auth = {
  // ログイン
  async signIn(email, password) {
    if (!supabase) return { error: { message: 'Supabase未接続' } };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (data?.user) {
      // ユーザープロフィールを取得してセッションに保存
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

  // ログアウト
  async signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    sessionStorage.removeItem('hs_user');
    window.location.href = '/pages/auth/login.html';
  },

  // 現在のセッション取得
  async getSession() {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data?.session ?? null;
  },

  // 認証チェック（非認証ならログインページへ）
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

// ── データベースアクセスヘルパー ──
const DB = {
  // 団員プロフィール
  profiles: {
    async get(userId) {
      if (!supabase) return null;
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      return data;
    },
    async list() {
      if (!supabase) return [];
      const { data } = await supabase.from('profiles').select('*').order('part').order('last_name');
      return data ?? [];
    },
  },

  // 楽譜
  scores: {
    async list() {
      if (!supabase) return [];
      const { data } = await supabase.from('scores').select('*').order('title');
      return data ?? [];
    },
    async get(id) {
      if (!supabase) return null;
      const { data } = await supabase.from('scores').select('*').eq('id', id).single();
      return data;
    },
  },

  // 出納帳
  ledger: {
    async list(year, month) {
      if (!supabase) return [];
      let query = supabase.from('ledger_entries').select('*').order('date', { ascending: false });
      if (year)  query = query.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`);
      if (month) query = query.gte('date', `${year}-${String(month).padStart(2,'0')}-01`);
      const { data } = await query;
      return data ?? [];
    },
  },

  // 楽器
  instruments: {
    async list() {
      if (!supabase) return [];
      const { data } = await supabase.from('instruments').select('*').order('instrument_number');
      return data ?? [];
    },
    async findByQR(code) {
      if (!supabase) return null;
      const { data } = await supabase.from('instruments').select('*').eq('instrument_number', code).single();
      return data;
    },
  },
};

// ── 初期化実行 ──
document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
});
