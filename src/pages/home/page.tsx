import { useState } from "react";

import ProfilePicture from "../../assets/kon.jpg";
import AnimeAds from "../../assets/ads-anime.jpg";

import { Input } from "../../shared/components/Input";

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
      <aside className="flex flex-row gap-2 bg-white my-3 mx-4 p-4 rounded-md shadow-md">
        <div className="border-4 border-solid border-green-600 p-1 rounded-xl">
          <img
            className="rounded-md"
            src={ProfilePicture}
            alt="Profile Picture"
            width="100"
            height="100"
          />
        </div>
        <div>
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
