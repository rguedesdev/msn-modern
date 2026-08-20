import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isTauri } from "@tauri-apps/api/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// Componentes
import { Input } from "../../shared/components/Input";
import { Footer } from "../../shared/components/Footer";
import { LoadingScreen } from "../../shared/components/LoadingScreen";
import { Checkbox } from "../../shared/components/Checkbox";
import { PictureFrame } from "../../shared/constants/PictureFrame/page";
import { toContactStatus } from "../../shared/constants/ContactStatusFrame/page";

// Constants
import {
  getStatusOptionClassName,
  LOGIN_STATUS_STORAGE_KEY,
  STATUS_CONFIG,
} from "../../shared/constants/StatusConfig/page";

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
import {
  authFormSchema,
  type AuthFormData,
  type AuthFormInput,
} from "../../shared/validation/forms";
// import MSNLogo3 from "./assets/msn3.jpg";

function LoginPage() {
  const { user, signIn, signUp } = useAuth();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isAuthSubmissionPending, setIsAuthSubmissionPending] = useState(false);
  const [loadingFrameTop, setLoadingFrameTop] = useState<number>();
  const [isRegistering, setIsRegistering] = useState(false);
  const [status, setStatus] =
    useState<keyof typeof STATUS_CONFIG>("online");
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const appWindow = useMemo(
    () => (isTauri() ? getCurrentWebviewWindow() : null),
    [],
  );

  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormInput, unknown, AuthFormData>({
    resolver: zodResolver(authFormSchema),
    defaultValues: {
      isRegistering: false,
      rememberMe: false,
      email: "",
      displayName: "",
      password: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

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
    if (user && !isAuthSubmissionPending) {
      navigate("/home", { replace: true });
    }
  }, [isAuthSubmissionPending, navigate, user]);

  const handleAuthSubmit = handleSubmit(async (data) => {
    setIsAuthSubmissionPending(true);
    try {
      if (data.isRegistering) {
        await signUp(data.email, data.displayName, data.password);
      } else {
        await signIn(data.email, data.password, data.rememberMe);
      }
      sessionStorage.setItem(LOGIN_STATUS_STORAGE_KEY, status);
      setLoadingFrameTop(
        document.getElementById("login-profile-frame")?.getBoundingClientRect().top,
      );
      setIsTransitioning(true);
      await new Promise((resolve) => window.setTimeout(resolve, 900));
      navigate("/home", { replace: true });
    } catch (error) {
      setIsAuthSubmissionPending(false);
      setError("root.server", {
        message: error instanceof Error ? error.message : "Não foi possível autenticar",
      });
    }
  });

  return (
    <>
      {isTransitioning ? (
        <LoadingScreen frameTop={loadingFrameTop} />
      ) : (
        <>
          <section className="relative flex h-screen flex-col items-center justify-center overflow-hidden bg-transparent font-sans antialiased [text-rendering:geometricPrecision]">
            <div className="relative flex h-full w-full flex-col overflow-visible rounded-[14px] border border-[#6694ad] bg-gradient-to-b from-[#f8fcfe] via-[#edf7fb] to-[#d8edf6]">
              <header
                data-tauri-drag-region
                className="msn-titlebar flex h-9 shrink-0 select-none items-center gap-2 border-b border-[#7fa9bf] bg-gradient-to-r from-[#8fcbe8] via-[#d4eefb] to-[#f4fbfe] pl-3"
              >
                <span className="msn-title-orbs flex items-center" aria-hidden="true">
                  <span className="msn-title-orb msn-title-orb--blue h-2.5 w-2.5 -translate-x-[0.5px]" />
                  <span className="msn-title-orb msn-title-orb--green z-10 -ml-1 h-3.5 w-3.5" />
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
                <div id="login-profile-frame" className="flex justify-center">
                  <PictureFrame
                    frame="status"
                    status={toContactStatus(status)}
                    fallback={(
                      <img
                        className="relative z-10 h-[104px] w-[110px] rounded-lg object-cover"
                        src={MSNLogo2}
                        alt="MSN Logo"
                      />
                    )}
                  />
                </div>

                <h1 className="mt-4 text-lg font-semibold text-[#284f65]">
                  Entrar no MSN
                </h1>

                <div className="mt-3 flex items-center gap-2">
                  <p className="text-xs font-medium text-[#52758a]">Status:</p>

                  <div
                    className="msn-status-picker relative"
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
                                className={getStatusOptionClassName(isSelected)}
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

                <form
                  className="contents [--msn-input-label-background:#e6f3f9] [&_input]:!shadow-none"
                  onSubmit={handleAuthSubmit}
                  noValidate
                >
                  <div className="mt-4 w-full">
                    {isRegistering && (
                      <>
                        <Input
                          inputName="Nome de exibição"
                          autoComplete="name"
                          maxLength={80}
                          disabled={isSubmitting}
                          aria-invalid={Boolean(errors.displayName)}
                          {...register("displayName")}
                        />
                        {errors.displayName && (
                          <p role="alert" className="mt-1 text-xs text-red-700">
                            {errors.displayName.message}
                          </p>
                        )}
                      </>
                    )}
                    <Input
                      inputName="Email"
                      type="email"
                      autoComplete="email"
                      disabled={isSubmitting}
                      aria-invalid={Boolean(errors.email)}
                      {...register("email")}
                    />
                    {errors.email && (
                      <p role="alert" className="mt-1 text-xs text-red-700">
                        {errors.email.message}
                      </p>
                    )}
                    <Input
                      inputName="Senha"
                      type="password"
                      autoComplete={isRegistering ? "new-password" : "current-password"}
                      maxLength={128}
                      disabled={isSubmitting}
                      aria-invalid={Boolean(errors.password)}
                      {...register("password")}
                    />
                    {errors.password && (
                      <p role="alert" className="mt-1 text-xs text-red-700">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  {!isRegistering && (
                    <div className="mt-3 w-full rounded-[9px] border border-white/75 bg-white/35 px-3 pb-3 pt-0.5">
                      <Checkbox
                        checkboxText="Manter conectado após fechar o aplicativo"
                        disabled={isSubmitting}
                        {...register("rememberMe")}
                      />
                    </div>
                  )}

                  {errors.root?.server?.message && (
                    <p role="alert" className="mt-3 w-full rounded-md border border-red-200 bg-red-50/80 px-3 py-2 text-xs text-red-700">
                      {errors.root.server.message}
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
                      const nextIsRegistering = !isRegistering;
                      setIsRegistering(nextIsRegistering);
                      setValue("isRegistering", nextIsRegistering);
                      clearErrors();
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
