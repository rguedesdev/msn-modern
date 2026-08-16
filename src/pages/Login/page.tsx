import { useState, useEffect, useMemo, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isTauri } from "@tauri-apps/api/core";

// Componentes
import { Input } from "../../shared/components/Input";
import { Footer } from "../../shared/components/Footer";
import { LoadingScreen } from "../../shared/components/LoadingScreen";
import { Checkbox } from "../../shared/components/Checkbox";

// Constants
import { STATUS_CONFIG } from "../../shared/constants/StatusConfig/page";

// Icones
import {
  MdArrowDropDown,
  MdClose,
  MdCropSquare,
  MdMinimize,
} from "react-icons/md";

// Imagens
import MSNLogo2 from "../../assets/images/msn2.jpg";
import { useAuth } from "../../shared/auth/AuthContext";
// import MSNLogo3 from "./assets/msn3.jpg";

function LoginPage() {
  const { user, signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] =
    useState<keyof typeof STATUS_CONFIG>("online");
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const appWindow = useMemo(
    () => (isTauri() ? getCurrentWebviewWindow() : null),
    [],
  );

  const navigate = useNavigate();

  useEffect(() => {
    const previousHtmlBackground = document.documentElement.style.background;
    const previousBodyBackground = document.body.style.background;

    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    if (appWindow) {
      void appWindow.setDecorations(false);
      void appWindow.setShadow(false);
    }

    return () => {
      document.documentElement.style.background = previousHtmlBackground;
      document.body.style.background = previousBodyBackground;
    };
  }, [appWindow]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 900);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user) navigate("/home", { replace: true });
  }, [navigate, user]);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    setIsSubmitting(true);
    try {
      if (isRegistering) {
        await signUp(email, displayName, password);
      } else {
        await signIn(email, password);
      }
      navigate("/home", { replace: true });
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Não foi possível autenticar");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {loading ? (
        <LoadingScreen />
      ) : (
        <>
          <section className="relative flex h-screen flex-col items-center justify-center overflow-hidden bg-transparent font-sans antialiased [text-rendering:geometricPrecision]">
            <div className="relative flex h-full w-full flex-col overflow-visible rounded-[14px] border border-[#6694ad] bg-gradient-to-b from-[#f8fcfe] via-[#edf7fb] to-[#d8edf6]">
              <header
                data-tauri-drag-region
                className="flex h-9 shrink-0 select-none items-center gap-2 rounded-t-[13px] border-b border-[#7fa9bf] bg-gradient-to-r from-[#8fcbe8] via-[#d4eefb] to-[#f4fbfe] pl-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
              >
                <span className="flex items-end" aria-hidden="true">
                  <span className="h-3.5 w-3.5 rounded-full bg-[#71bf45] ring-1 ring-white" />
                  <span className="-ml-1 h-3 w-3 rounded-full bg-[#43a9d7] ring-1 ring-white" />
                </span>
                <span
                  data-tauri-drag-region
                  className="min-w-0 flex-1 text-xs font-semibold text-[#315b72]"
                >
                  MSN Messenger
                </span>
                <div className="flex h-full items-stretch">
                  <button
                    type="button"
                    aria-label="Minimizar"
                    onClick={() => void appWindow?.minimize()}
                    className="grid w-9 place-items-center text-[#426b81] transition-colors hover:bg-white/50"
                  >
                    <MdMinimize size={17} />
                  </button>
                  <button
                    type="button"
                    aria-label="Maximizar ou restaurar"
                    onClick={() => void appWindow?.toggleMaximize()}
                    className="grid w-9 place-items-center text-[#426b81] transition-colors hover:bg-white/50"
                  >
                    <MdCropSquare size={13} />
                  </button>
                  <button
                    type="button"
                    aria-label="Fechar"
                    onClick={() => void appWindow?.close()}
                    className="grid w-10 place-items-center rounded-tr-[13px] text-[#426b81] transition-colors hover:bg-[#d86161] hover:text-white"
                  >
                    <MdClose size={18} />
                  </button>
                </div>
              </header>

              <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 py-6">
                <div className="rounded-[18px] border border-[#6694ad] bg-gradient-to-br from-white via-[#e9f7fc] to-[#a9d9eb] p-1.5 shadow-[0_4px_12px_rgba(38,79,103,0.2)]">
                  <img
                    className="h-[104px] w-[110px] rounded-[13px] border border-white object-cover"
                    src={MSNLogo2}
                    alt="MSN Logo"
                  />
                </div>

                <h1 className="mt-4 text-lg font-semibold text-[#284f65]">
                  Entrar no Messenger
                </h1>
                <p className="mt-1 text-center text-xs text-[#67899a]">
                  Converse com seus contatos e veja quem está online.
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <p className="text-xs font-medium text-[#52758a]">Status:</p>

                  <div
                    className="relative"
                    onBlur={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget)) {
                        setIsStatusMenuOpen(false);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setIsStatusMenuOpen(false);
                      }
                    }}
                  >
                    <button
                      type="button"
                      aria-expanded={isStatusMenuOpen}
                      aria-haspopup="listbox"
                      onClick={() => setIsStatusMenuOpen((isOpen) => !isOpen)}
                      className="group inline-flex items-center gap-2 rounded-md border border-transparent px-2 py-1 text-[#47748c] transition-colors hover:border-white hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-[#65afd0]/40"
                    >
                      <span
                        className={`h-3 w-3 rounded-full border border-white shadow-sm ${STATUS_CONFIG[status].color}`}
                      />
                      <span className="text-xs font-medium">
                        {STATUS_CONFIG[status].label}
                      </span>
                      <MdArrowDropDown
                        aria-hidden="true"
                        className={`text-[#527b90] transition-transform duration-200 ${isStatusMenuOpen ? "rotate-180" : ""}`}
                        size={18}
                      />
                    </button>

                    {isStatusMenuOpen && (
                      <div
                        role="listbox"
                        aria-label="Escolher status de entrada"
                        className="absolute left-1/2 top-full z-30 mt-1.5 flex min-w-[175px] -translate-x-1/2 flex-col gap-1 overflow-hidden rounded-[10px] border border-[#7faec4] bg-gradient-to-b from-[#f8fdff] to-[#e3f3fa] p-1.5 shadow-[0_10px_30px_rgba(35,76,98,0.24)]"
                      >
                        {Object.entries(STATUS_CONFIG).map(
                          ([statusValue, statusData]) => {
                            const isSelected = statusValue === status;

                            return (
                              <button
                                key={statusValue}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                  setStatus(
                                    statusValue as keyof typeof STATUS_CONFIG,
                                  );
                                  setIsStatusMenuOpen(false);
                                }}
                                className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs transition-colors ${
                                  isSelected
                                    ? "border border-white bg-white/80 font-semibold text-[#286c8d]"
                                    : "border border-transparent text-[#52758a] hover:border-white hover:bg-white/65"
                                }`}
                              >
                                <span
                                  className={`h-3 w-3 rounded-full border border-white shadow-sm ${statusData.color}`}
                                />
                                <span className="flex-1">
                                  {statusData.label}
                                </span>
                                {isSelected && (
                                  <span
                                    aria-hidden="true"
                                    className="text-xs text-[#3295c2]"
                                  >
                                    ✓
                                  </span>
                                )}
                              </button>
                            );
                          },
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <form className="contents" onSubmit={handleAuthSubmit}>
                  <div className="mt-4 w-full">
                    {isRegistering && (
                      <Input
                        inputName="Nome de exibição"
                        name="displayName"
                        value={displayName}
                        onChange={(event) => setDisplayName(event.currentTarget.value)}
                        autoComplete="name"
                        minLength={1}
                        maxLength={80}
                        required
                        disabled={isSubmitting}
                      />
                    )}
                    <Input
                      inputName="Email"
                      type="email"
                      name="email"
                      value={email}
                      onChange={(event) => setEmail(event.currentTarget.value)}
                      autoComplete="email"
                      required
                      disabled={isSubmitting}
                    />
                    <Input
                      inputName="Senha"
                      type="password"
                      name="password"
                      value={password}
                      onChange={(event) => setPassword(event.currentTarget.value)}
                      autoComplete={isRegistering ? "new-password" : "current-password"}
                      minLength={10}
                      maxLength={128}
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  {!isRegistering && (
                    <div className="mt-3 w-full rounded-[9px] border border-white/75 bg-white/35 px-3 pb-3 pt-0.5 shadow-[inset_0_1px_0_white]">
                      <Checkbox checkboxText="Manter conectado nesta execução" />
                    </div>
                  )}

                  {authError && (
                    <p role="alert" className="mt-3 w-full rounded-md border border-red-200 bg-red-50/80 px-3 py-2 text-xs text-red-700">
                      {authError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-6 w-full rounded-md border border-[#3989b1] bg-gradient-to-b from-[#78c5e5] to-[#3295c2] px-4 py-3 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_2px_4px_rgba(31,82,108,0.24)] transition hover:from-[#8bd1ec] hover:to-[#3aa2cf] active:translate-y-px disabled:cursor-wait disabled:opacity-60"
                  >
                    {isSubmitting ? "AGUARDE..." : isRegistering ? "CADASTRAR" : "ENTRAR"}
                  </button>
                </form>

                <div className="mt-4">
                  <Footer
                    isRegistering={isRegistering}
                    onRegister={() => {
                      setIsRegistering((current) => !current);
                      setAuthError("");
                    }}
                  />
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}

export default LoginPage;
