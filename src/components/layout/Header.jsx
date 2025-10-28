import React from "react";
import { useUser } from "@/contexts/UserContext";
import { Menu } from "lucide-react";

const Header = () => {
  const { user, companies } = useUser();

  return (
    <header className="flex justify-between items-center px-6 py-3 bg-white border-b shadow-sm">
      <div className="flex items-center gap-3">
        <Menu className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-lg font-bold text-primary">
            {companies?.[0]?.name || "Stout System"}
          </h1>
          <p className="text-sm text-muted-foreground">Painel Stout System</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-muted-foreground">
          {user?.name || "Usuário"}
        </span>
        <img
          src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
          alt="user"
          className="w-8 h-8 rounded-full border"
        />
      </div>
    </header>
  );
};

export default Header;
