import { useTranslation } from "react-i18next";

export const RadioButton = ({ type, id, name, label, checked, onChange }) => {
  const { t } = useTranslation();

  return (
    <label
      htmlFor={id}
      className={`flex justify-center items-center bg-gray-100 text-gray-700 rounded-md p-1 md:p-2 lg:px-3 lg:my-2  hover:bg-indigo-300 cursor-pointer  ${
        checked ? "bg-indigo-600" : "bg-white"
      }`}
    >
      <input
        className="hidden"
        type={type}
        id={id}
        value={id}
        name={name}
        aria-label={label}
        aria-checked={checked}
        checked={checked}
        onChange={onChange}
      />

      <span
        className={`group line-clamp-3 w-20 text-md text-center font-medium hover:text-white ${
          checked ? "text-white" : "text-indigo-600"
        }`}
      >
        {t(label)}
      </span>
    </label>
  );
};
