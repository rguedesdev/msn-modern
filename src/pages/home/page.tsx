// Imports Principais
import { useState, useEffect } from "react";

// Importa as funções nativas do Tauri para controle de janelas
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow"; // Para cria

// Componentes
import { PictureFrame } from "../../shared/components/PictureFrame/page";
import { Input } from "../../shared/components/Input";

// Icones
import { TbPhoneCall } from "react-icons/tb";
import { AiOutlineVideoCamera } from "react-icons/ai";
import {
  MdOutlinePerson,
  MdOutlinePersonAddAlt,
  MdOutlinePersonOff,
} from "react-icons/md";
import { MdOutlineGroups } from "react-icons/md";
import { ImMakeGroup } from "react-icons/im";

// Imagens
import AnimeAds from "../../assets/ads-anime.jpg";

function HomePage() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeChat, setActiveChat] = useState(null); // Armazena a conversa aberta interna (modo maximizado)

  const [status, setStatus] = useState("ausente");

  useEffect(() => {
    const appWindow = getCurrentWindow();

    // Verifica o estado inicial ao carregar a página
    appWindow.isMaximized().then(setIsMaximized);

    // Escuta mudanças de tamanho ou maximização em tempo real
    const unlisten = appWindow.onResized(async () => {
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  // Lógica do duplo clique no contato
  const handleContactClick = (contato) => {
    if (isMaximized) {
      setActiveChat(contato);
    } else {
      // ⚠️ ALTERADO AQUI: Adicionado index.html antes do hash #
      const chatWindow = new WebviewWindow(`chat-${contato.id}`, {
        url: `index.html#/chat/${contato.id}`,
        title: `Conversa com ${contato.name}`,
        width: 900,
        height: 500,
        resizable: true,
        decorations: true,
      });

      chatWindow.once("tauri://created", () => {
        console.log("Janela de chat aberta!");
      });
    }
  };

  // 1. Estado para controlar qual aba está ativa (Padrão: geral/online)
  const [activeTab, setActiveTab] = useState("geral");

  // 2. Simulação dos dados que virão do seu banco de dados
  const contatosMock = [
    {
      id: 1,
      name: "Ju_S2_Anime",
      status: "online",
      msg: "Ouvindo: Linkin Park",
      group: "Escola",
    },
    {
      id: 2,
      name: "XXx_Hacker_xXX",
      status: "ocupado",
      msg: "Não incomodar!",
      group: "Trabalho",
    },
    {
      id: 3,
      name: "Vash_The_Stampede",
      status: "ausente",
      msg: "Fui almoçar",
      group: "Geral",
    },
    {
      id: 4,
      name: "Sasuke_Uchiha",
      status: "offline",
      msg: "",
      group: "Geral",
    },
  ];

  // 3. Configuração visual e lógica das abas
  const tabsConfig = [
    {
      id: "geral",
      label: "Online",
      icon: <MdOutlinePerson size={18} />,
    },
    { id: "grupos", label: "Grupos", icon: <MdOutlineGroups size={18} /> },
    {
      id: "offlines",
      label: "Offline",
      icon: <MdOutlinePersonOff size={18} />,
    },
  ];

  // 4. Função que filtra quais contatos aparecem baseando-se na aba ativa
  const getFiltrados = () => {
    if (activeTab === "geral")
      return contatosMock.filter((c) => c.status !== "offline");
    if (activeTab === "offlines")
      return contatosMock.filter((c) => c.status === "offline");
    return contatosMock; // Para grupos faremos uma lógica de agrupamento abaixo
  };

  const statusColors = {
    online: "bg-green-500",
    ocupado: "bg-red-500",
    ausente: "bg-yellow-400",
    offline: "bg-zinc-300",
  };

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
  };

  // Lista estática com os padrões para referência ou fallback
  const PICTURE_FRAME = {
    // --- AS QUE VOCÊ JÁ TEM ---
    quentes: "linear-gradient(90deg, #ff4500, #ff007f, #ffaa00, #ff4500)",
    frias: "linear-gradient(90deg, #00f0ff, #0072ff, #7f00ff, #00f0ff)",
    nitro: "linear-gradient(90deg, #5865F2, #EB459F, #5865F2)",
    cyberpunk: "linear-gradient(90deg, #ff0055, #00ffcc, #9900ff, #ff0055)",
    matrix: "linear-gradient(90deg, #00ff7f, #00aa00, #00ffff, #00ff7f)",
    gold: "linear-gradient(90deg, #ffe066, #f5b041, #f9e79f, #ffe066)",
    mono: "linear-gradient(90deg, #ffffff, #333333, #ffffff)",

    // --- NOVAS COMBINAÇÕES INCRÍVEIS ---

    // 🔮 Synthwave / Outrun (Anos 80 profundo - Azul escuro, roxo e rosa neon)
    synthwave: "linear-gradient(90deg, #0018ff, #bd00ff, #ff00b8, #0018ff)",

    // 🌌 Vaporwave / Algodão Doce (Tons pastéis estéticos e relaxantes)
    vaporwave: "linear-gradient(90deg, #ff9a9e, #fecfef, #a1c4fd, #ff9a9e)",

    // 🧛 Vampiro / Sangue (Preto e Vermelho Carmesim - Muito usado para contas góticas/clãs)
    vampire: "linear-gradient(90deg, #ff0000, #1a0000, #ff0000)",

    // 🪐 Aurora Boreal (Verde esmeralda misturado com roxo místico)
    aurora: "linear-gradient(90deg, #0575e6, #00f260, #7f00ff, #0575e6)",

    // 💎 Diamante / Gelo Cósmico (Branco brilhante, ciano pastel e azul claro)
    diamond: "linear-gradient(90deg, #e0f7fa, #80deea, #b2ebf2, #e0f7fa)",

    // 🎨 RGB Gamer (O clássico arco-íris rotativo de teclados mecânicos)
    rgb: "linear-gradient(90deg, #ff0000, #00ff00, #0000ff, #ff00ff, #ff0000)",

    // 🧛 Dracula Official (Roxo, Rosa e Ciano oficiais da paleta)
    dracula: "linear-gradient(90deg, #bd93f9, #ff79c6, #8be9fd, #bd93f9)",
  };

  // ⭐ CONSTANTE DE CONTEXTO VISUAL PARA EFEITOS DE TEXTO
  const TEXT_EFFECTS = {
    // Gera a máscara de gradiente baseada na cor escolhida
    gradient: (gradientStyle) => ({
      background: gradientStyle,
      backgroundSize: "300% 100%",

      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    }),
    // Gera o efeito de filamento branco com aura neon colorida
    neon: (glowColorPrimary, glowColorSecondary) => ({
      color: "#ffffff",
      textShadow: `0 0 4px ${glowColorPrimary}, 0 0 10px ${glowColorPrimary}, 0 0 20px ${glowColorSecondary || glowColorPrimary}`,
    }),
  };

  return (
    <main className="h-screen flex flex-col bg-[#ebf3f6]">
      {/* 1. SEÇÃO DO SEU PERFIL (MANTIDA NO TOPO) */}
      <aside className="flex flex-col gap-2 bg-white my-3 mx-4 p-4 rounded-md shadow-md">
        <div className="flex flex-row gap-2 max-h-[140px]">
          <PictureFrame pictureFrame={PICTURE_FRAME.quentes} />
          <div className="flex flex-col justify-between">
            <div className="flex flex-col">
              <div className="flex flex-row items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full border-[1px] border-solid border-zinc-500 ${
                    statusConfig[status as keyof typeof statusConfig].color
                  }`}
                />

                {/* 👑 NICKNAME COM ESTILO DE TEXTO */}
                <span
                  className="text-[20px] font-extrabold select-none animate-[gradientMove_4s_linear_infinite]"
                  style={TEXT_EFFECTS.gradient(PICTURE_FRAME.quentes)}
                >
                  Kon-sama ZS
                </span>

                <span className="text-[15px] font-light italic">{`(Ausente)`}</span>
              </div>

              <p className="text-[13px] text-[#6ebea1]">{`<Insira uma mensagem pessoal>`}</p>
            </div>

            <div className="flex flex-row items-center gap-3">
              <MdOutlinePersonAddAlt size={23} />
              <ImMakeGroup size={15} />
              <TbPhoneCall size={20} />
              <AiOutlineVideoCamera size={20} />
            </div>
          </div>
        </div>
      </aside>

      {/* CONTAINER FLEXBOX DIRECIONAL PARA SUPORTAR O CHAT LATERAL */}
      <div className="flex-1 flex flex-row min-h-0 min-w-0">
        {/* 2. COLUNA DE CONTATOS (SE ADAPTA AUTOMATICAMENTE) */}
        <section
          className={`${isMaximized && activeChat ? "w-[380px]" : "flex-1"} h-[520px] bg-white my-2 mx-4 p-4 rounded-md shadow-md flex flex-col gap-4 transition-all duration-300`}
        >
          {/* Input de busca mantido no topo */}
          <Input inputName="Buscar contato" />

          {/* BARRA DE ABAS (TABS) */}
          <div className="flex flex-row justify-center border-b border-zinc-200">
            {tabsConfig.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-[2px] ${
                    isSelected
                      ? "border-[#6ebea1] text-[#6ebea1]"
                      : "border-transparent text-zinc-400 hover:text-zinc-600"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* LISTAGEM DE CONTATOS FILTRADA COM SCROLL INTERNO */}
          <div className="flex-1 overflow-y-auto min-h-0 pr-1 flex flex-col gap-2">
            {activeTab !== "grupos"
              ? // RENDERIZAÇÃO PADRÃO (GERAL OU OFFLINES)
                getFiltrados().map((contato) => (
                  <div
                    key={contato.id}
                    onDoubleClick={() => handleContactClick(contato)} // 👈 GATILHO DE JANELA (ABAS GERAIS)
                    className="flex flex-row items-center gap-3 p-1.5 rounded-md hover:bg-zinc-50 cursor-pointer select-none"
                  >
                    {/* Mini Avatar Falso estilo MSN */}
                    <div className="relative w-8 h-8 bg-zinc-200 rounded-md flex items-center justify-center border border-zinc-300">
                      <span className="text-xs text-zinc-500 font-bold">
                        {contato.name[0]}
                      </span>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${statusColors[contato.status as keyof typeof statusColors]}`}
                      />
                    </div>
                    {/* Informações do Contato */}
                    <div className="flex flex-col min-w-0">
                      <span
                        className={`text-sm font-medium ${contato.status === "offline" ? "text-zinc-400" : "text-zinc-800"}`}
                      >
                        {contato.name}
                      </span>
                      {contato.msg && (
                        <span className="text-xs text-zinc-400 truncate">
                          {contato.msg}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              : // RENDERIZAÇÃO POR GRUPOS
                ["Escola", "Trabalho", "Geral"].map((grupoName) => {
                  const contatosDoGrupo = contatosMock.filter(
                    (c) => c.group === grupoName,
                  );
                  return (
                    <div key={grupoName} className="mb-2">
                      <h4 className="text-xs font-bold text-zinc-400 bg-zinc-50 px-2 py-0.5 rounded-sm mb-1">
                        {grupoName} ({contatosDoGrupo.length})
                      </h4>
                      {contatosDoGrupo.map((contato) => (
                        <div
                          key={contato.id}
                          onDoubleClick={() => handleContactClick(contato)} // 👈 GATILHO DE JANELA (ABAS GRUPOS)
                          className="flex flex-row items-center gap-3 p-1.5 pl-4 rounded-md hover:bg-zinc-50 cursor-pointer select-none"
                        >
                          <div className="relative w-7 h-7 bg-zinc-200 rounded-md flex items-center justify-center border border-zinc-300">
                            <span className="text-xs text-zinc-500 font-bold">
                              {contato.name[0]}
                            </span>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${statusColors[contato.status as keyof typeof statusColors]}`}
                            />
                          </div>
                          <span className="text-sm text-zinc-700">
                            {contato.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
          </div>
        </section>

        {/* 3. COLUNA DIREITA: JANELA DE CONVERSA EMBUTIDA (SÓ EXIBE SE O APP ESTIVER MAXIMIZADO) */}
        {isMaximized && activeChat && (
          <section className="flex-1 h-[520px] bg-white my-2 mr-4 p-4 rounded-md shadow-md flex flex-col gap-2 transition-all duration-300 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
              <div className="flex flex-col">
                <h3 className="font-bold text-zinc-700 text-base">
                  {activeChat.name}
                </h3>
                <span className="text-xs text-zinc-400">
                  {activeChat.msg || "Sem sub-mensagem"}
                </span>
              </div>
              <button
                onClick={() => setActiveChat(null)}
                className="text-xs text-zinc-400 hover:text-zinc-600 bg-zinc-100 px-2 py-1 rounded transition-colors"
              >
                Fechar Conversa
              </button>
            </div>

            {/* Histórico das Mensagens */}
            <div className="flex-1 bg-zinc-50 my-1 rounded-md p-3 overflow-y-auto min-h-0 text-sm">
              <p className="text-xs text-zinc-400 italic text-center mb-2">
                Início da conversa com {activeChat.name}
              </p>
            </div>

            {/* Input de Envio de Mensagem */}
            <input
              type="text"
              placeholder={`Enviar mensagem para ${activeChat.name}...`}
              className="border border-zinc-200 p-2 rounded-md text-sm outline-none focus:border-[#6ebea1] transition-colors"
            />
          </section>
        )}
      </div>

      {/* 4. SEÇÃO INFERIOR DE ANÚNCIOS (OCULTA NO MODO CHAT INTEGRADO SE NÃO COUBER) */}
      {(!isMaximized || !activeChat) && (
        <section className="h-[180px] bg-white my-2 mx-4 p-4 rounded-md shadow-md flex flex-col">
          <div className="w-full h-full flex flex-col">
            <h3 className="text-zinc-300 text-sm mb-2 select-none">
              Advertisement
            </h3>
            <div className="w-full flex-1 min-h-0 rounded-md overflow-hidden bg-zinc-50 flex items-center justify-center">
              <img
                className="w-full h-full object-contain"
                src={AnimeAds}
                alt="Advertisement"
              />
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

export default HomePage;
