import { loginAction } from "../actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="login-wrap">
      <form action={loginAction} className="login-card">
        {params.msg && (
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--danger)" }}>
            Acesso negado.
          </p>
        )}
        <div className="field">
          <label htmlFor="username">Usuário</label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            autoFocus
            required
          />
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <button type="submit" className="btn" style={{ marginTop: 16, width: "100%" }}>
          Entrar
        </button>
      </form>
    </div>
  );
}
