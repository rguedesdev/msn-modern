// // import { useState, useEffect } from "react";
// // import { useParams } from "react-router-dom";
// // // Importamos o WebviewWindow para conseguir criar novas janelas via código
// // import {
// //   getCurrentWebviewWindow,
// //   WebviewWindow,
// // } from "@tauri-apps/api/webviewWindow";
// // import { emit, listen } from "@tauri-apps/api/event";

// // // Icons
// // import { MdVoiceChat } from "react-icons/md";
// // import { FaMicrophoneAlt, FaHeadphonesAlt } from "react-icons/fa";

// // // Imagens e Sons
// // import NudgeIcon from "../../assets/msn-nudge-icon.png";
// // import nudgeSound from "../../assets/sounds/nudge.mp3";

// // function ChatWindow() {
// //   const { id } = useParams();
// //   const [isNudging, setIsNudging] = useState(false);
// //   const appWindow = getCurrentWebviewWindow();

// //   // EFEITO VISUAL E SONORO
// //   const triggerNudgeEffect = async () => {
// //     if (isNudging) return;
// //     setIsNudging(true);

// //     try {
// //       const audio = new Audio(nudgeSound);
// //       audio.volume = 1.0;
// //       audio.play();
// //     } catch (audioError) {
// //       console.error("Erro ao reproduzir o som:", audioError);
// //     }

// //     try {
// //       // Quando o evento chegar, a janela acorda, foca e sobe na tela
// //       await appWindow.unminimize();
// //       await appWindow.show();
// //       await appWindow.setFocus();
// //     } catch (error) {
// //       console.error("Erro ao focar janela nativa:", error);
// //     }

// //     setTimeout(() => {
// //       setIsNudging(false);
// //     }, 500);
// //   };

// //   // AÇÃO DO REMETENTE
// //   const handleSendNudge = async () => {
// //     // Treme a sua própria tela (feedback local)
// //     await triggerNudgeEffect();

// //     // Dispara o evento global que TODAS as janelas do mesmo processo vão ouvir
// //     await emit("msn-nudge-received", { fromId: id });
// //   };

// //   // FUNÇÃO TEMPORÁRIA: Abre uma segunda janela para testar o receptor
// //   const openTestWindow = () => {
// //     // Cria uma nova janela nativa usando o motor do Tauri
// //     const webview = new WebviewWindow("janela-destinatario-teste", {
// //       url: window.location.href, // Abre a mesma URL do chat atual
// //       title: "MSN - Destinatário (Janela 2)",
// //       width: 400,
// //       height: 500,
// //     });

// //     webview.once("tauri://created", () => {
// //       console.log("Segunda janela criada com sucesso no mesmo processo!");
// //     });
// //   };

// //   // OUVINTE DO DESTINATÁRIO
// //   useEffect(() => {
// //     let unlisten: (() => void) | undefined;

// //     async function setupListener() {
// //       // Agora que estão no mesmo processo, o listen vai capturar o emit da outra janela!
// //       unlisten = await listen("msn-nudge-received", (event) => {
// //         console.log("Nudge interceptado da outra janela!");
// //         triggerNudgeEffect();
// //       });
// //     }

// //     setupListener();

// //     return () => {
// //       if (unlisten) unlisten();
// //     };
// //   }, []);

// //   return (
// //     <main
// //       className={`h-screen w-screen bg-[#ebf3f6] p-3 flex flex-col transition-transform ${
// //         isNudging ? "animate-nudge" : ""
// //       }`}
// //     >
// //       {/* BOTÃO DE TESTE DE INFRAESTRUTURA LOCAL */}
// //       <div className="mb-2">
// //         <button
// //           onClick={openTestWindow}
// //           className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 rounded shadow"
// //         >
// //           [Teste] Abrir Segunda Janela (Destinatário)
// //         </button>
// //       </div>

// //       <div className="flex-1 bg-white rounded-md shadow-md p-4 flex flex-col justify-between min-h-0">
// //         <div className="flex-1 bg-zinc-50 rounded-md p-3 overflow-y-auto min-h-0 text-sm">
// //           <p className="text-xs text-zinc-400 italic text-center mb-2">
// //             Janela de conversa (ID: {id})
// //           </p>
// //         </div>

// //         {/* Caixa de Ações */}
// //         <div className="mt-2 flex items-center">
// //           <button
// //             className="hover:bg-zinc-100 px-1 py-2 rounded transition-colors disabled:opacity-50"
// //             onClick={handleSendNudge}
// //             disabled={isNudging}
// //             title="Chamar a atenção"
// //           >
// //             <img src={NudgeIcon} alt="Nudge Icon" width={35} height={35} />
// //           </button>

// //           <button className="hover:bg-zinc-100 p-2 rounded transition-colors disabled:opacity-50">
// //             <MdVoiceChat className="text-zinc-500" size={22} />
// //           </button>
// //           <button className="hover:bg-zinc-100 p-2 rounded transition-colors disabled:opacity-50">
// //             <FaMicrophoneAlt className="text-zinc-500" size={22} />
// //           </button>
// //           <button className="hover:bg-zinc-100 p-2 rounded transition-colors disabled:opacity-50">
// //             <FaHeadphonesAlt className="text-zinc-500" size={22} />
// //           </button>
// //         </div>

// //         <input
// //           type="text"
// //           placeholder="Digite uma mensagem..."
// //           className="border border-zinc-200 p-2 mt-3 rounded-md text-sm outline-none focus:border-[#6ebea1] transition-colors"
// //         />
// //       </div>
// //     </main>
// //   );
// // }

// // export default ChatWindow;

// import { useState, useEffect } from "react";
// import { useParams } from "react-router-dom";
// // Importamos o WebviewWindow para conseguir criar novas janelas via código
// import {
//   getCurrentWebviewWindow,
//   WebviewWindow,
// } from "@tauri-apps/api/webviewWindow";
// import { emit, listen } from "@tauri-apps/api/event";

// // Icons
// import { MdVoiceChat } from "react-icons/md";
// import { FaMicrophoneAlt, FaHeadphonesAlt } from "react-icons/fa";

// // Imagens e Sons
// import NudgeIcon from "../../assets/msn-nudge-icon.png";
// import nudgeSound from "../../assets/sounds/nudge.mp3";

// function ChatWindow() {
//   const { id } = useParams();
//   const [isNudging, setIsNudging] = useState(false);
//   const appWindow = getCurrentWebviewWindow();

//   // EFEITO VISUAL E SONORO
//   const triggerNudgeEffect = async () => {
//     if (isNudging) return;
//     setIsNudging(true);

//     try {
//       const audio = new Audio(nudgeSound);
//       audio.volume = 1.0;
//       audio.play();
//     } catch (audioError) {
//       console.error("Erro ao reproduzir o som:", audioError);
//     }

//     try {
//       // Quando o evento chegar, a janela acorda, foca e sobe na tela
//       await appWindow.unminimize();
//       await appWindow.show();
//       await appWindow.setFocus();
//     } catch (error) {
//       console.error("Erro ao focar janela nativa:", error);
//     }

//     setTimeout(() => {
//       setIsNudging(false);
//     }, 500);
//   };

//   // AÇÃO DO REMETENTE
//   const handleSendNudge = async () => {
//     // Treme a sua própria tela (feedback local)
//     await triggerNudgeEffect();

//     // Passamos o label da janela atual para o Destinatário saber quem mandou e não ignorar
//     await emit("msn-nudge-received", {
//       fromId: id,
//       senderLabel: appWindow.label,
//     });
//   };

//   // FUNÇÃO TEMPORÁRIA: Abre uma segunda janela para testar o receptor
//   const openTestWindow = () => {
//     // Cria uma nova janela nativa usando o motor do Tauri
//     const webview = new WebviewWindow("janela-destinatario-teste", {
//       url: window.location.href, // Abre a mesma URL do chat atual
//       title: "MSN - Destinatário (Janela 2)",
//       width: 400,
//       height: 500,
//     });

//     webview.once("tauri://created", () => {
//       console.log("Segunda janela criada com sucesso no mesmo processo!");
//     });
//   };

//   // OUVINTE DO DESTINATÁRIO
//   useEffect(() => {
//     let unlisten: (() => void) | undefined;

//     async function setupListener() {
//       unlisten = await listen("msn-nudge-received", (event) => {
//         const payload = event.payload as {
//           fromId: string;
//           senderLabel: string;
//         };

//         // Correção do conflito: se o evento veio de mim mesmo, o receptor ignora
//         // Isso garante que o remetente trema pelo clique e o destinatário trema pelo evento
//         if (payload && payload.senderLabel === appWindow.label) {
//           return;
//         }

//         console.log("Nudge interceptado da outra janela!");

//         // Terceiro Caso do MSN: Se a janela do destinatário receber o evento,
//         // ela se força a aparecer na tela (caso esteja fechada ou em background) e chacoalha.
//         triggerNudgeEffect();
//       });
//     }

//     setupListener();

//     return () => {
//       if (unlisten) unlisten();
//     };
//   }, [appWindow.label, isNudging]); // Dependências controladas para evitar travamento de escopo

//   return (
//     <main
//       className={`h-screen w-screen bg-[#ebf3f6] p-3 flex flex-col transition-transform ${
//         isNudging ? "animate-nudge" : ""
//       }`}
//     >
//       {/* BOTÃO DE TESTE DE INFRAESTRUTURA LOCAL */}
//       <div className="mb-2">
//         <button
//           onClick={openTestWindow}
//           className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 rounded shadow"
//         >
//           [Teste] Abrir Segunda Janela (Destinatário)
//         </button>
//       </div>

//       <div className="flex-1 bg-white rounded-md shadow-md p-4 flex flex-col justify-between min-h-0">
//         <div className="flex-1 bg-zinc-50 rounded-md p-3 overflow-y-auto min-h-0 text-sm">
//           <p className="text-xs text-zinc-400 italic text-center mb-2">
//             Janela de conversa (ID: {id})
//           </p>
//         </div>

//         {/* Caixa de Ações */}
//         <div className="mt-2 flex items-center">
//           <button
//             className="hover:bg-zinc-100 px-1 py-2 rounded transition-colors disabled:opacity-50"
//             onClick={handleSendNudge}
//             disabled={isNudging}
//             title="Chamar a atenção"
//           >
//             <img src={NudgeIcon} alt="Nudge Icon" width={35} height={35} />
//           </button>

//           <button className="hover:bg-zinc-100 p-2 rounded transition-colors disabled:opacity-50">
//             <MdVoiceChat className="text-zinc-500" size={22} />
//           </button>
//           <button className="hover:bg-zinc-100 p-2 rounded transition-colors disabled:opacity-50">
//             <FaMicrophoneAlt className="text-zinc-500" size={22} />
//           </button>
//           <button className="hover:bg-zinc-100 p-2 rounded transition-colors disabled:opacity-50">
//             <FaHeadphonesAlt className="text-zinc-500" size={22} />
//           </button>
//         </div>

//         <input
//           type="text"
//           placeholder="Digite uma mensagem..."
//           className="border border-zinc-200 p-2 mt-3 rounded-md text-sm outline-none focus:border-[#6ebea1] transition-colors"
//         />
//       </div>
//     </main>
//   );
// }

// export default ChatWindow;

import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
// Importamos o WebviewWindow para conseguir criar novas janelas via código
import {
  getCurrentWebviewWindow,
  WebviewWindow,
} from "@tauri-apps/api/webviewWindow";
import { emit, listen } from "@tauri-apps/api/event";

// Icons
import { MdVoiceChat } from "react-icons/md";
import { FaMicrophoneAlt, FaHeadphonesAlt } from "react-icons/fa";

// Imagens e Sons
import NudgeIcon from "../../assets/msn-nudge-icon.png";
import nudgeSound from "../../assets/sounds/nudge.mp3";

function ChatWindow() {
  const { id } = useParams();
  const [isNudging, setIsNudging] = useState(false);
  const appWindow = getCurrentWebviewWindow();

  // Guarda o estado em um Ref para o useEffect ler o valor atualizado sem precisar se reiniciar
  const isNudgingRef = useRef(isNudging);
  useEffect(() => {
    isNudgingRef.current = isNudging;
  }, [isNudging]);

  // EFEITO VISUAL E SONORO
  const triggerNudgeEffect = async () => {
    if (isNudgingRef.current) return;
    setIsNudging(true);

    try {
      const audio = new Audio(nudgeSound);
      audio.volume = 1.0;
      audio.play();
    } catch (audioError) {
      console.error("Erro ao reproduzir o som:", audioError);
    }

    try {
      // Quando o evento chegar, a janela acorda, foca e sobe na tela (Terceiro Caso)
      await appWindow.unminimize();
      await appWindow.show();
      await appWindow.setFocus();
    } catch (error) {
      console.error("Erro ao focar janela nativa:", error);
    }

    setTimeout(() => {
      setIsNudging(false);
    }, 500);
  };

  // AÇÃO DO REMETENTE
  const handleSendNudge = async () => {
    // Treme a sua própria tela (feedback local)
    await triggerNudgeEffect();

    // Dispara o evento passando o label da janela atual
    await emit("msn-nudge-received", {
      fromId: id,
      senderLabel: appWindow.label,
    });
  };

  // FUNÇÃO TEMPORÁRIA: Abre uma segunda janela para testar o receptor
  const openTestWindow = () => {
    // Cria uma nova janela nativa usando o motor do Tauri
    const webview = new WebviewWindow("janela-destinatario-teste", {
      url: window.location.href, // Abre a mesma URL do chat atual
      title: "MSN - Destinatário (Janela 2)",
      width: 400,
      height: 500,
    });

    webview.once("tauri://created", () => {
      console.log("Segunda janela criada com sucesso no mesmo processo!");
    });
  };

  // OUVINTE DO DESTINATÁRIO
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    async function setupListener() {
      // O array de dependências vazio garante que esse listener seja criado UMA ÚNICA vez
      unlisten = await listen("msn-nudge-received", (event) => {
        const payload = event.payload as {
          fromId: string;
          senderLabel: string;
        };

        // Se o evento veio de mim mesmo, ignora para não matar o tremor síncrono local
        if (payload && payload.senderLabel === appWindow.label) {
          return;
        }

        console.log("Nudge interceptado da outra janela!");
        triggerNudgeEffect();
      });
    }

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, []); // Mantido limpo para não quebrar o ciclo de eventos do Tauri

  return (
    <main
      className={`h-screen w-screen bg-[#ebf3f6] p-3 flex flex-col transition-transform ${
        isNudging ? "animate-nudge" : ""
      }`}
    >
      {/* BOTÃO DE TESTE DE INFRAESTRUTURA LOCAL */}
      <div className="mb-2">
        <button
          onClick={openTestWindow}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 rounded shadow"
        >
          [Teste] Abre Segunda Janela (Destinatário)
        </button>
      </div>

      <div className="flex-1 bg-white rounded-md shadow-md p-4 flex flex-col justify-between min-h-0">
        <div className="flex-1 bg-zinc-50 rounded-md p-3 overflow-y-auto min-h-0 text-sm">
          <p className="text-xs text-zinc-400 italic text-center mb-2">
            Janela de conversa (ID: {id})
          </p>
        </div>

        {/* Caixa de Ações */}
        <div className="mt-2 flex items-center">
          <button
            className="hover:bg-zinc-100 px-1 py-2 rounded transition-colors disabled:opacity-50"
            onClick={handleSendNudge}
            disabled={isNudging}
            title="Chamar a atenção"
          >
            <img src={NudgeIcon} alt="Nudge Icon" width={35} height={35} />
          </button>

          <button className="hover:bg-zinc-100 p-2 rounded transition-colors disabled:opacity-50">
            <MdVoiceChat className="text-zinc-500" size={22} />
          </button>
          <button className="hover:bg-zinc-100 p-2 rounded transition-colors disabled:opacity-50">
            <FaMicrophoneAlt className="text-zinc-500" size={22} />
          </button>
          <button className="hover:bg-zinc-100 p-2 rounded transition-colors disabled:opacity-50">
            <FaHeadphonesAlt className="text-zinc-500" size={22} />
          </button>
        </div>

        <input
          type="text"
          placeholder="Digite uma mensagem..."
          className="border border-zinc-200 p-2 mt-3 rounded-md text-sm outline-none focus:border-[#6ebea1] transition-colors"
        />
      </div>
    </main>
  );
}

export default ChatWindow;
