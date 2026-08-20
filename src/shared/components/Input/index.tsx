import { forwardRef, type InputHTMLAttributes } from "react";

interface IInput extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  inputName: string;
  type?: "text" | "password" | "email";
}

const Input = forwardRef<HTMLInputElement, IInput>(function Input(
  { inputName, type = "text", ...inputProps },
  ref,
) {
  return (
    <div className="relative mt-3 w-full">
      <input
        ref={ref}
        type={type}
        {...inputProps}
        placeholder=" "
        className="peer w-full rounded-[8px] border border-[#9dbdcc] bg-white/75 px-3 py-2.5 text-sm text-[#304f60] shadow-[inset_0_1px_3px_rgba(47,91,113,0.08),0_1px_0_white] outline-none transition-all hover:border-[#70afd0] focus:border-[#4d9fc4] focus:bg-white focus:ring-2 focus:ring-[#70b9d8]/25"
      />

      <label className="msn-floating-input-label pointer-events-none absolute left-3 top-0 z-10 -translate-y-1/2 bg-transparent px-1 text-[11px] leading-none text-[#67899a] transition-all duration-200 before:absolute before:inset-x-0 before:top-1/2 before:z-0 before:h-1 before:-translate-y-1/2 before:content-[''] peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:before:hidden peer-focus:top-0 peer-focus:text-[11px] peer-focus:text-[#328db7] peer-focus:before:block peer-hover:text-[#328db7]">
        <span className="relative z-10">{inputName}</span>
      </label>
    </div>
  );
});

export { Input };
