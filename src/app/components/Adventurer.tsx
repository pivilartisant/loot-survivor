import { useState } from "react";
import { useContracts } from "../hooks/useContracts";
import { useWriteContract } from "../hooks/useWriteContract";
import { useAdventurer } from "../context/AdventurerProvider";
import { useQuery } from "@apollo/client";
import { AdventurersList } from "./AdventurersList";
import { CreateAdventurer } from "./CreateAdventurer";
import About from "./About";
import VerticalKeyboardControl from "./VerticalMenu";

const Adventurer = () => {
  const { writeAsync, addToCalls } = useWriteContract();
  const { adventurerContract } = useContracts();
  const { adventurer, handleUpdateAdventurer } = useAdventurer();
  const [activeMenu, setActiveMenu] = useState(0);
  const [selected, setSelected] = useState<String>("");

  const menu = [
    {
      id: 1,
      label: "Choose Adventurer",
      value: "choose adventurer",
      action: () => setSelected,
    },
    {
      id: 2,
      label: "Create Adventurer",
      value: "create adventurer",
      action: () => setSelected,
    },
    {
      id: 3,
      label: "About",
      value: "about",
      action: () => setSelected,
    },
  ];

  return (
    <div className="flex flex-row gap-2">
      <div className="w-1/3">
        <VerticalKeyboardControl
          buttonsData={menu}
          onSelected={(value) => setSelected(value)}
          isActive={activeMenu == 0}
          setActiveMenu={setActiveMenu}
        />
      </div>

      {selected === "choose adventurer" && (
        <div className="w-2/3">
          <AdventurersList
            isActive={activeMenu == 1}
            onEscape={() => setActiveMenu(0)}
          />
        </div>
      )}
      {selected === "create adventurer" && (
        <div className="w-2/3">
          <CreateAdventurer
            isActive={activeMenu == 2}
            onEscape={() => setActiveMenu(0)}
          />
        </div>
      )}
      {selected === "about" && (
        <div className="w-2/3">
          <About />
        </div>
      )}
    </div>
  );
};

export default Adventurer;
