import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [company, setCompany] = useState(null);
  const [subscription, setSubscription] = useState(null); // assinatura do ProdLog especificamente
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [impersonation, setImpersonation] = useState(null);

  async function loadAll(userId) {
    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(profileData ?? null);

    // A empresa "ativa" pode ser a própria, ou — se for equipe da
    // plataforma personificando um cliente pra dar suporte — a
    // empresa personificada. current_company_id() já resolve isso.
    const { data: activeCompanyId } = await supabase.rpc("current_company_id");

    if (activeCompanyId) {
      const { data: companyData } = await supabase.from("companies").select("*").eq("id", activeCompanyId).single();
      setCompany(companyData ?? null);

      const { data: subData } = await supabase
        .from("company_products")
        .select("*, plans:plan_id (name, price, features, included_users, extra_user_price)")
        .eq("company_id", activeCompanyId)
        .eq("product_key", "prodpersonal")
        .maybeSingle();
      setSubscription(subData ?? null);
    } else {
      setCompany(null);
      setSubscription(null);
    }

    if (profileData?.platform_role) {
      const { data: activeImpersonation } = await supabase
        .from("platform_impersonations")
        .select("id, company_id, companies:company_id (name)")
        .eq("staff_profile_id", userId)
        .gt("expires_at", new Date().toISOString())
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setImpersonation(activeImpersonation ?? null);
    } else {
      setImpersonation(null);
    }
  }

  async function stopImpersonating() {
    if (impersonation) {
      await supabase.from("platform_impersonations").delete().eq("id", impersonation.id);
    }
    if (session?.user) await loadAll(session.user.id);
  }

  useEffect(() => {
    let loadedUserId = null;

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);

      // O navegador dispara esse evento de novo toda vez que a aba
      // volta a ficar visível — mesmo sem o usuário ter mudado. Se já
      // carregamos o perfil dessa mesma pessoa, não precisa recarregar
      // do zero.
      if (session?.user && loadedUserId === session.user.id) {
        setLoading(false);
        return;
      }

      if (session?.user) {
        setProfileLoading(true);
        await loadAll(session.user.id);
        loadedUserId = session.user.id;
        setProfileLoading(false);
      } else {
        setProfile(null);
        setCompany(null);
        setSubscription(null);
        loadedUserId = null;
        setProfileLoading(false);
      }
      setLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn({ email, password }) {
    return supabase.auth.signInWithPassword({ email, password });
  }
  async function signOut() {
    await supabase.auth.signOut();
  }
  async function refreshCompany() {
    if (profile?.id) await loadAll(profile.id);
  }

  return (
    <AuthContext.Provider value={{ session, profile, company, subscription, loading, profileLoading, signIn, signOut, refreshCompany, impersonation, stopImpersonating }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
