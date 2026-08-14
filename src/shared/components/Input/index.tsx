interface IInput {
  inputName: string;
  type?: "text" | "password";
}

function Input({ inputName, type = "text" }: IInput) {
  return (
    <div className="relative mt-3 w-full">
      <input
        type={type}
        placeholder=" "
        className="peer w-full rounded-[8px] border border-[#9dbdcc] bg-white/75 px-3 py-2.5 text-sm text-[#304f60] shadow-[inset_0_1px_3px_rgba(47,91,113,0.08),0_1px_0_white] outline-none transition-all hover:border-[#70afd0] focus:border-[#4d9fc4] focus:bg-white focus:ring-2 focus:ring-[#70b9d8]/25"
      />

      <label className="pointer-events-none absolute -top-2 left-3 rounded bg-[#eef8fc] px-1 text-[11px] text-[#67899a] transition-all duration-200 peer-placeholder-shown:top-2.5 peer-placeholder-shown:bg-transparent peer-placeholder-shown:text-sm peer-focus:-top-2 peer-focus:bg-[#eef8fc] peer-focus:text-[11px] peer-focus:text-[#328db7] peer-hover:text-[#328db7]">
        {inputName}
      </label>
    </div>
  );
}

export { Input };
