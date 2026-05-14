interface IInput {
  inputName: string;
}

function Input({ inputName }: IInput) {
  return (
    <div className="relative w-full mt-2">
      <input
        type="text"
        placeholder=" "
        className="peer w-full rounded-[7px] border border-zinc-300 bg-transparent px-3 py-2.5 text-sm text-zinc-700 outline-none transition-all hover:border-[#6ebea1] focus:border-[#6ebea1]"
      />

      <label className="pointer-events-none absolute left-3 top-2.5 bg-white px-1 text-sm text-zinc-500 transition-all duration-200 peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-sm peer-focus:-top-2 peer-focus:text-[11px] peer-focus:text-[#6ebea1] peer-not-placeholder-shown:-top-2 peer-not-placeholder-shown:text-[11px] peer-hover:text-[#6ebea1]">
        {inputName}
      </label>
    </div>
  );
}

export { Input };
