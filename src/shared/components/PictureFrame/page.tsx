// Imagens
import ProfilePicture from "../../../assets/kon.jpg";

// Lista estática com os padrões para referência ou fallback
const GRADIENT_PATTERNS = {
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

function PictureFrame({ activeGradient }) {
  // Define um fallback caso a prop venha vazia ou indefinida do banco
  const currentGradient = activeGradient || GRADIENT_PATTERNS.dracula;

  return (
    <div className="relative p-[6px]">
      {/* Ajusta o respiro externo da moldura */}
      {/* A moldura com gradiente animado */}
      <div
        className="absolute inset-0 rounded-xl animate-[gradientMove_4s_linear_infinite]"
        style={{
          background: currentGradient,
          backgroundSize: "300% 100%",
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          WebkitMask:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          padding: "5px" /* Espessura da borda */,
        }}
      />
      {/* A Foto de Perfil */}
      <img
        className="relative z-10 rounded-lg object-cover"
        src={ProfilePicture}
        alt="Profile Picture"
        width="100"
        height="100"
      />
    </div>
  );
}

export { PictureFrame, GRADIENT_PATTERNS };
