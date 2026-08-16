function Footer({
  isRegistering = false,
  onRegister,
}: {
  isRegistering?: boolean;
  onRegister?: () => void;
}) {
  return (
    <footer className="text-center">
      <div className="flex flex-col items-center gap-1">
        <div className="flex flex-row items-center gap-1 text-xs font-medium text-[#52758a]">
          <span>Esqueceu a Senha?</span>
          <span className="font-semibold text-[#1680bb]">
            Clique aqui
          </span>
        </div>
        <div>
          <div className="flex flex-row items-center gap-1 text-xs text-[#67899a]">
            <span>{isRegistering ? "Já tem uma conta?" : "Não tem uma conta?"}</span>
            <button
              type="button"
              onClick={onRegister}
              className="font-semibold text-[#1680bb] transition hover:text-[#075f91] hover:underline"
            >
              {isRegistering ? "Entrar" : "Cadastre-se"}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

export { Footer };
