// Imagens
import MSNLogo3 from "../../../assets/msn3.jpg";
import MessengerLogo from "../../../assets/messenger.png";

function LoadingScreen() {
  return (
    <section className="h-screen flex flex-col justify-center items-center gap-10">
      <div className="mt-[150px] mb-[300px]">
        <img src={MSNLogo3} className="" width="170" height="179" alt="" />
      </div>
      <div className="flex flex-col gap-10">
        <img src={MessengerLogo} className="" width="250" height="179" alt="" />

        <div className="relative h-1 w-[250px] overflow-hidden rounded-full bg-zinc-600">
          <div className="absolute left-[-40%] top-0 h-full w-[40%] rounded-full bg-[#aad0ef] animate-[loading_1.2s_linear_infinite]" />
        </div>

        <style>{`
        @keyframes loading {
          0% {
            left: -40%;
          }

          100% {
            left: 100%;
          }
        }
      `}</style>
      </div>
    </section>
  );
}

export { LoadingScreen };
