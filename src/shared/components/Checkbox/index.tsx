import { IoCheckmark } from "react-icons/io5";
import { FaCheck } from "react-icons/fa";
import { ImCheckmark } from "react-icons/im";

interface ICheckbox {
  checkboxText: string;
}

function Checkbox({ checkboxText }: ICheckbox) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none mt-3">
      <div className="relative">
        <input type="checkbox" className="peer sr-only" />

        <div className="flex items-center justify-center w-5 h-5 rounded-md border border-zinc-400 bg-white transition-all duration-200 peer-hover:border-[#6ebea1] peer-checked:bg-[#6ebea1] peer-checked:border-[#6ebea1]">
          <ImCheckmark className="text-white text-[16px] opacity-0 transition-opacity" />
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity peer-checked:opacity-100">
          <ImCheckmark className="text-white text-[16px]" />
        </div>
      </div>

      <span className="text-sm text-zinc-600">{checkboxText}</span>
    </label>
  );
}

export { Checkbox };
