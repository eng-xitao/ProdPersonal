import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const AuthContext = createContext(null);
const PRODUCT_KEY = "prodpersonal";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [company, setCompany] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [productAccess, setProductAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [impersonation, setImpersonation] = useState(null);

  async function loadAll(userId) {
    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(profileData ?? null);

    const { data: activeCompanyId } = await supabase.rpc("current_company_id");

    if (activeCompanyId) {
      const { data: companyData } = await supabase.from("companies").select("*").eq("id", activeCompanyId).single();
      setCompany(companyData ?? null);

      const { data: subData } = await supabase
        .from("company_products")
        .select("*, plans:plan_id (name, price, features, included_users, extra_user_price)")
        .eq("company_id", activeCompanyId)
        .eq("product_key", PRODUCT_KEY)
        .maybeSingle();
      setSubscription(subData ?? null);
    } else {
      setCompany(null);
      setSubscription(null);
    }

    // A autorização do produto é centralizada no ProdCore/Supabase.
    const { data: hasAccess } = await supabase.rpc("has_product_access", { p_product_key: PRODUCT_KEY });
    setProductAccess(hasAccess === true);

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
        setProductAccess(false);
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
    <AuthContext.Provider value={{ session, profile, company, subscription, productAccess, loading, profileLoading, signIn, signOut, refreshCompany, impersonation, stopImpersonating }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
