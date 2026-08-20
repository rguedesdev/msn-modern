import { forwardRef, type InputHTMLAttributes } from "react";
import { ImCheckmark } from "react-icons/im";

interface ICheckbox extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  checkboxText: string;
}

const Checkbox = forwardRef<HTMLInputElement, ICheckbox>(function Checkbox(
  { checkboxText, ...inputProps },
  ref,
) {
  return (
    <label className="mt-3 flex cursor-pointer select-none items-center gap-2">
      <div className="relative">
        <input
          {...inputProps}
          ref={ref}
          type="checkbox"
          className="peer sr-only"
        />

        <div className="flex h-5 w-5 items-center justify-center rounded-md border border-[#8cabb9] bg-white/85 transition-all duration-200 peer-hover:border-[#4d9fc4] peer-checked:border-[#3989b1] peer-checked:bg-gradient-to-b peer-checked:from-[#78c5e5] peer-checked:to-[#3295c2]">
          <ImCheckmark className="text-white text-[16px] opacity-0 transition-opacity" />
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity peer-checked:opacity-100">
          <ImCheckmark className="text-white text-[16px]" />
        </div>
      </div>

      <span className="text-xs text-[#52758a]">{checkboxText}</span>
    </label>
  );
});

export { Checkbox };
