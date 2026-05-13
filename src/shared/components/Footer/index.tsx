function Footer() {
  return (
    <footer>
      <div className="flex flex-col items-center gap-1">
        <div className="flex flex-row items-center gap-1 font-semibold text-[#6ebea1] text-sm">
          <span>Esqueceu a Senha?</span>
          <span className="font-medium transition-all ease hover:text-[#1b7c59] hover:underline cursor-pointer">
            Clique aqui
          </span>
        </div>
        <div>
          <div className="flex flex-row items-center gap-1 text-zinc-600 text-sm">
            <span>Não tem uma conta?</span>
            <span className="font-medium transition-all ease hover:text-[#aad0ef] hover:underline cursor-pointer">
              Cadastre-se
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export { Footer };
