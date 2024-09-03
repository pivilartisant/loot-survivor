import { useState } from "react";
import { Contract } from "starknet";
import { MdClose } from "react-icons/md";
import { displayAddress, copyToClipboard, formatNumber } from "@/app/lib/utils";
import Eth from "public/icons/eth.svg";
import Lords from "public/icons/lords.svg";
import { Button } from "@/app/components/buttons/Button";
import useUIStore from "@/app/hooks/useUIStore";

interface TopUpProps {
  ethBalance: bigint;
  lordsBalance: bigint;
  costToPlay: bigint;
  mintLords: () => Promise<void>;
  gameContract: Contract;
  lordsContract: Contract;
  ethContract: Contract;
  showTopUpDialog: (value: boolean) => void;
}

const TopUp = ({
  ethBalance,
  lordsBalance,
  costToPlay,
  mintLords,
  gameContract,
  lordsContract,
  ethContract,
  showTopUpDialog,
}: TopUpProps) => {
  const onSepolia = useUIStore((state) => state.onSepolia);
  const topUpAccount = useUIStore((state) => state.topUpAccount);
  const [copiedLords, setCopiedLords] = useState(false);
  const [copiedEth, setCopiedEth] = useState(false);

  const handleCopyLords = () => {
    copyToClipboard(lordsContract.address);
    setCopiedLords(true);
    setTimeout(() => setCopiedLords(false), 2000);
  };

  const handleCopyEth = () => {
    copyToClipboard(ethContract.address);
    setCopiedEth(true);
    setTimeout(() => setCopiedEth(false), 2000);
  };

  return (
    <>
      <div className="flex flex-col items-center gap-5 p-10 z-20 fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-black border border-terminal-green">
        <button
          className="absolute top-2 right-2 cursor-pointer text-terminal-green"
          onClick={() => {
            showTopUpDialog(false);
          }}
        >
          <MdClose size={50} />
        </button>
        <h1 className="m-0 uppercase text-6xl text-center">Top Up Required</h1>
        {topUpAccount === "eth" && (
          <p className="text-2xl text-center">
            You need to top up ETH to continue playing.
          </p>
        )}
        {topUpAccount === "lords" && (
          <p className="text-2xl text-center">
            You need to top up Lords to start a game.
          </p>
        )}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="flex flex-row items-center gap-2 relative">
              <Lords className="self-center sm:w-8 sm:h-8  h-3 w-3 fill-current mr-1" />
              <p className="uppercase">
                Current Balance:{" "}
                {formatNumber(parseInt(lordsBalance.toString()) / 10 ** 18)}
              </p>
            </span>
            {onSepolia ? (
              <Button onClick={() => mintLords()}>Mint Lords</Button>
            ) : (
              <>
                <span className="uppercase">
                  {displayAddress(lordsContract.address)}
                </span>
                <Button size={"xs"} onClick={handleCopyLords}>
                  Copy
                </Button>
                {copiedLords && (
                  <span className="absolute right-[-50px] uppercase">
                    Copied!
                  </span>
                )}
              </>
            )}
          </div>
          <span className="flex flex-col relative">
            <div className="flex flex-col gap-2">
              <span className="flex flex-row items-center gap-2 relative">
                <Eth className="self-center sm:w-8 sm:h-8  h-3 w-3 fill-current mr-1" />
                <p>
                  Current Balance:{" "}
                  {formatNumber(parseInt(ethBalance.toString()) / 10 ** 18)}
                </p>
              </span>
              <span className="flex flex-row items-center gap-2 relative">
                <span className="uppercase">
                  {displayAddress(ethContract.address)}
                </span>
                <Button size={"xs"} onClick={handleCopyEth}>
                  Copy
                </Button>
                {copiedEth && (
                  <span className="absolute right-[-50px] uppercase">
                    Copied!
                  </span>
                )}
              </span>
            </div>
          </span>
        </div>
      </div>
    </>
  );
};

export default TopUp;
