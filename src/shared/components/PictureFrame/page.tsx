// Imagens
import ProfilePicture from "../../../assets/kon.jpg";

function PictureFrame({ pictureFrame }) {
  return (
    <div className="relative p-[6px]">
      <div
        className="absolute inset-0 rounded-xl animate-[gradientMove_4s_linear_infinite]"
        style={{
          background: pictureFrame,
          backgroundSize: "300% 100%",
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          WebkitMask:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          padding: "8px" /* Espessura da borda */,
        }}
      />
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

export { PictureFrame };

// import ProfilePicture from "../../../assets/kon.jpg";
// import VenomFrame from "../../../assets/venon_frame.png";

// function PictureFrame() {
//   return (
//     <div className="relative w-[140px] h-[140px] overflow-visible flex items-center justify-center">
//       {/* AVATAR CENTRALIZADO */}
//       <img
//         src={ProfilePicture}
//         alt="Profile"
//         className="w-[100px] h-[100px] object-cover rounded-lg"
//       />

//       {/* FRAME MAIOR QUE O AVATAR */}
//       <div
//         className="absolute inset-0 pointer-events-none"
//         style={{
//           backgroundImage: `url(${VenomFrame})`,
//           backgroundSize: "100% 100%",
//           backgroundRepeat: "no-repeat",
//           backgroundPosition: "center",
//         }}
//       />
//     </div>
//   );
// }

// export { PictureFrame };
