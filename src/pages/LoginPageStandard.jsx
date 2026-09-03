import { useState } from "react";
import { useAuth } from "../lib/AuthContext";

export default function LoginPageStandard(){
  const {signIn}=useAuth();
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [show,setShow]=useState(false);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  async function submit(e){
    e.preventDefault();
    setError("");
    setLoading(true);
    const {error}=await signIn({email,password});
    if(error)setError("E-mail ou senha incorretos.");
    setLoading(false);
  }

  return <div className="pp-login-shell">
    <form onSubmit={submit} className="pp-login-card">
      <img src="/brand/prodpersonal-logo.svg" alt="ProdPersonal" className="pp-login-logo" />
      <div className="pp-login-badge">ACESSO AO SISTEMA</div>
      <h1 className="pp-login-title">Entrar</h1>
      <p className="pp-login-text">Informe seus dados de acesso para continuar.</p>
      <label className="pp-login-field"><span>Usuário</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" placeholder="seu@empresa.com.br" required /></label>
      <label className="pp-login-field"><span>Senha</span><div className="pp-login-password"><input type={show?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" placeholder="Sua senha" required /><button type="button" onClick={()=>setShow(v=>!v)}>{show?"Ocultar":"Visualizar"}</button></div></label>
      {error&&<div className="pp-login-error" role="alert">{error}</div>}
      <button className="pp-login-submit" type="submit" disabled={loading}>{loading?"Entrando...":"Entrar"}</button>
    </form>
  </div>;
}
