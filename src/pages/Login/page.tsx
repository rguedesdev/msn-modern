import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Componentes
import { Input } from "../../shared/components/Input";
import { Footer } from "../../shared/components/Footer";
import { LoadingScreen } from "../../shared/components/LoadingScreen";
import { Checkbox } from "../../shared/components/Checkbox";

// Icones
import { MdArrowDropDown } from "react-icons/md";

// Imagens
import MSNLogo2 from "../../assets/msn2.jpg";
// import MSNLogo3 from "./assets/msn3.jpg";

function LoginPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("online");

  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  function handleSignIn() {
    navigate("/home");
  }

  const statusConfig = {
    online: {
      label: "Online",
      color: "bg-green-500",
    },
    ocupado: {
      label: "Ocupado",
      color: "bg-red-500",
    },
    ausente: {
      label: "Ausente",
      color: "bg-yellow-400",
    },
    invisivel: {
      label: "Invisível",
      color: "bg-zinc-200",
    },
    // offline: {
    //   label: "Offline",
    //   color: "bg-zinc-600",
    // },
  };

  return (
    <>
      {loading ? (
        <LoadingScreen />
      ) : (
        <>
          {/* <h1>Entrar no MSN Messenger</h1> */}
          <section className="h-screen flex flex-col justify-center items-center">
            <div>
              <img
                className="border-2 border-solid border-zinc-500 rounded-2xl py-5 px-3"
                src={MSNLogo2}
                alt="MSN Logo"
                width="150"
                height="150"
              />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <p className="text-sm text-zinc-600">Status:</p>

              <div className="flex items-center gap-2">
                <div className="relative flex items-center">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="bg-transparent border-none outline-none appearance-none text-sm text-zinc-500 cursor-pointer pr-4"
                  >
                    <option value="online">Online</option>
                    <option value="ocupado">Ocupado</option>
                    <option value="ausente">Ausente</option>
                    <option value="invisivel">Invisível</option>
                    {/* <option value="offline">Offline</option> */}
                  </select>

                  <span className="absolute right-0 pointer-events-none text-zinc-500">
                    <MdArrowDropDown size={18} />
                  </span>
                </div>

                <span
                  className={`w-3 h-3 rounded-full border-[2px] border-solid border-zinc-600 ${
                    statusConfig[status as keyof typeof statusConfig].color
                  }`}
                />
              </div>
            </div>

            <div className="w-[250px]">
              <Input inputName={`Email`} />
              <Input inputName={`Senha`} />
            </div>

            <div className="mt-4">
              <Checkbox checkboxText="Lembrar minha senha" />
              <Checkbox checkboxText="Continuar conectado" />
              <Checkbox checkboxText="Entrar automaticamente" />
            </div>

            <button
              onClick={handleSignIn}
              type="button"
              className="w-[250px] p-4 text-white font-semibold bg-[#6ebea1] hover:bg-[#53b08e] active:scale-[.96] rounded-lg transition-all ease-in mt-8 mb-4 shadow-md"
            >
              ENTRAR
            </button>
            <Footer />
          </section>
        </>
      )}
    </>
  );
}

export default LoginPage;
