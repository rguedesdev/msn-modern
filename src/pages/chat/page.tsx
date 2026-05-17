// Imports principais
import { useState } from "react";
import { useParams } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";

// Icons
import { MdVoiceChat } from "react-icons/md";
import { LiaMicrophoneSolid } from "react-icons/lia";
import { FaMicrophoneAlt } from "react-icons/fa";
import { FaHeadphonesAlt } from "react-icons/fa";

// Imagens
import NudgeIcon from "../../assets/msn-nudge-icon.png";

// Sons
import nudgeSound from "../../assets/sounds/nudge.mp3";

function ChatWindow() {
  const { id } = useParams();
  const [isNudging, setIsNudging] = useState(false);

  const handleNudge = async () => {
    if (isNudging) return;

    setIsNudging(true);

    // Toca o som clássico de chamar a atenção
    // O caminho "/" aponta direto para a sua pasta 'public'
    try {
      const audio = new Audio(nudgeSound);
      audio.volume = 1.0; // Ajusta o volume se achar muito estourado (0.0 a 1.0)
      audio.play();
    } catch (audioError) {
      console.error("Erro ao reproduzir o som:", audioError);
    }

    try {
      const appWindow = getCurrentWindow();
      await appWindow.unminimize();
      await appWindow.show();
      await appWindow.setFocus();
    } catch (error) {
      console.error("Erro ao focar janela do Tauri:", error);
    }

    setTimeout(() => {
      setIsNudging(false);
    }, 500); // Duração idêntica à animação do Tailwind
  };

  return (
    /* Aqui aplicamos o 'animate-nudge' dinamicamente usando a interpolação do Tailwind */
    <main
      className={`h-screen w-screen bg-[#ebf3f6] p-3 flex flex-col ${isNudging ? "animate-nudge" : ""}`}
    >
      <div className="flex-1 bg-white rounded-md shadow-md p-4 flex flex-col justify-between min-h-0">
        {/* Histórico das Mensagens */}
        <div className="flex-1 bg-zinc-50 rounded-md p-3 overflow-y-auto min-h-0 text-sm">
          <p className="text-xs text-zinc-400 italic text-center mb-2">
            Janela de conversa reservada (Contato ID: {id})
          </p>
        </div>

        {/* Caixa de Ações */}
        <div className="mt-2 flex items-center">
          <button
            className="hover:bg-zinc-100 px-1 py-2 rounded transition-colors disabled:opacity-50"
            onClick={handleNudge}
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

        {/* Caixa de Texto */}
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
