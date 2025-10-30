import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

const DarkModeToggle = () => {
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );

  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors duration-300 
                 bg-[var(--muted)] hover:bg-[var(--border)] text-[var(--foreground)]"
      title="Alternar tema"
    >
      {darkMode ? (
        <>
          <Sun className="w-4 h-4 text-yellow-400" /> <span>Claro</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-blue-400" /> <span>Escuro</span>
        </>
      )}
    </button>
  );
};

export default DarkModeToggle;
