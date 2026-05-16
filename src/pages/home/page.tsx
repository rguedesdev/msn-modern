import { useState } from "react";

// Componentes
import { PictureFrame } from "../../shared/components/PictureFrame/page";
import { Input } from "../../shared/components/Input";

// Icones
import { TbPhoneCall } from "react-icons/tb";
import { AiOutlineVideoCamera } from "react-icons/ai";
import { MdOutlinePersonAddAlt } from "react-icons/md";
import { MdOutlineGroups } from "react-icons/md";
import { ImMakeGroup } from "react-icons/im";

// Imagens
import AnimeAds from "../../assets/ads-anime.jpg";

function HomePage() {
  const [status, setStatus] = useState("ausente");

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

  return (
    <main className="h-screen flex flex-col bg-[#ebf3f6]">
      <aside className="flex flex-col gap-2 bg-white my-3 mx-4 p-4 rounded-md shadow-md">
        <div className="flex flex-row gap-2">
          <PictureFrame />
          <div className="flex flex-col justify-between">
            <div className="flex flex-col">
              <div className="flex flex-row items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full border-[2px] border-solid border-zinc-600 ${
                    statusConfig[status as keyof typeof statusConfig].color
                  }`}
                />
                <span className="text-[15px] font-semibold">Kon-sama ZS</span>
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

      <section className="h-[520px] bg-white my-2 mx-4 p-4 rounded-md shadow-md">
        <Input inputName="Buscar contato" />
        Contatos
      </section>

      <section className="h-[180px] bg-white my-2 mx-4 p-4 rounded-md shadow-md">
        <div>
          <h3 className="text-zinc-300 text-sm mb-2">Advertisement</h3>
          <img
            className="object-contain"
            src={AnimeAds}
            alt="Profile Picture"
            width="400"
            height="50"
          />
        </div>
      </section>
    </main>
  );
}

export default HomePage;
