function Footer() {
  return (
    <footer className="text-center">
      <div className="flex flex-col items-center gap-1">
        <div className="flex flex-row items-center gap-1 text-xs font-medium text-[#52758a]">
          <span>Esqueceu a Senha?</span>
          <span className="cursor-pointer font-semibold text-[#1680bb] transition hover:text-[#075f91] hover:underline">
            Clique aqui
          </span>
        </div>
        <div>
          <div className="flex flex-row items-center gap-1 text-xs text-[#67899a]">
            <span>Não tem uma conta?</span>
            <span className="cursor-pointer font-semibold text-[#1680bb] transition hover:text-[#075f91] hover:underline">
              Cadastre-se
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export { Footer };
