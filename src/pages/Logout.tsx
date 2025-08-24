import React from "react";
import Seo from "@/components/Seo";
import { useAuth } from "@/hooks/use-auth";

const Logout: React.FC = () => {
  const { signOut } = useAuth();

  React.useEffect(() => {
    // Trigger logout on mount
    signOut();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Seo title="Sair • Lysbox" description="Encerrando sua sessão com segurança" />
      <main className="min-h-screen grid place-items-center bg-gradient-subtle">
        <section className="text-center">
          <h1 className="text-xl font-semibold">Saindo…</h1>
          <p className="text-muted-foreground text-sm">Você será redirecionado em instantes.</p>
        </section>
      </main>
    </>
  );
};

export default Logout;
