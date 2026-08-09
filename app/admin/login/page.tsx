import { loginAction } from "../actions";
import TechBackground from "../components/TechBackground";
import PlansWidget from "../components/PlansWidget";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const params = await searchParams;

  return (
    <>
      <TechBackground variant="login" />
      <div className="login-wrap">
      <div className="login-inner">
        <h1 className="visually-hidden">Entrar no painel OfferSnap</h1>
        <img src="/logo.svg" alt="OfferSnap" className="login-logo" />
        <form action={loginAction} className="login-card">
          {params.msg && (
            <p
              role="alert"
              style={{ margin: "0 0 14px", fontSize: 13, color: "var(--danger)" }}
            >
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
    </div>
      <PlansWidget />
    </>
  );
}
