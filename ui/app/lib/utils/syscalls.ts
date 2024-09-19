import { Connector } from "@starknet-react/core";
import { processNotifications } from "app/components/notifications/NotificationHandler";
import { QueryData, QueryKey } from "app/hooks/useQueryStore";
import { Network, ScreenPage } from "app/hooks/useUIStore";
import { AdventurerClass } from "app/lib/classes";
import { checkArcadeConnector } from "app/lib/connectors";
import { getWaitRetryInterval } from "app/lib/constants";
import { GameData } from "app/lib/data/GameData";
import {
  DataType,
  getKeyFromValue,
  getRandomInt,
  indexAddress,
  stringToFelt,
} from "app/lib/utils";
import { parseEvents } from "app/lib/utils/parseEvents";
import {
  Adventurer,
  Battle,
  Beast,
  Call,
  Discovery,
  FormData,
  Item,
  ItemPurchase,
  NullAdventurer,
  PragmaPrice,
  SpecialBeast,
  TransactionParams,
  UpgradeStats,
} from "app/types";
import { JSXElementConstructor, ReactElement, useMemo } from "react";
import {
  AccountInterface,
  Contract,
  InvokeTransactionReceiptResponse,
  ProviderInterface,
  RevertedTransactionReceiptResponse,
} from "starknet";

export interface SyscallsProps {
  gameContract: Contract;
  ethContract: Contract;
  lordsContract: Contract;
  beastsContract: Contract;
  pragmaContract: Contract;
  rendererContractAddress: string;
  addTransaction: ({ hash, metadata }: TransactionParams) => void;
  queryData: QueryData;
  resetData: (queryKey?: QueryKey) => void;
  setData: (
    queryKey: QueryKey,
    data: any,
    attribute?: string,
    index?: number
  ) => void;
  adventurer: AdventurerClass;
  addToCalls: (value: Call) => void;
  calls: Call[];
  handleSubmitCalls: (
    account: AccountInterface,
    calls: Call[],
    isArcade: boolean,
    ethBalance: number,
    showTopUpDialog: (show: boolean) => void,
    setTopUpAccount: (account: string) => void,
    network: Network
  ) => Promise<any>;
  startLoading: (
    type: string,
    pendingMessage: string | string[],
    data: any,
    adventurer: number | undefined
  ) => void;
  stopLoading: (
    notificationData: any,
    error?: boolean | undefined,
    type?: string
  ) => void;
  setTxHash: (hash: string) => void;
  setEquipItems: (value: string[]) => void;
  setDropItems: (value: string[]) => void;
  setDeathMessage: (
    deathMessage: ReactElement<any, string | JSXElementConstructor<any>>
  ) => void;
  showDeathDialog: (value: boolean) => void;
  setScreen: (value: ScreenPage) => void;
  setAdventurer: (value: Adventurer) => void;
  setStartOption: (value: string) => void;
  ethBalance: bigint;
  lordsBalance: bigint;
  showTopUpDialog: (value: boolean) => void;
  setTopUpAccount: (value: string) => void;
  account: AccountInterface;
  setSpecialBeastDefeated: (value: boolean) => void;
  setSpecialBeast: (value: SpecialBeast) => void;
  connector?: Connector;
  getEthBalance: () => Promise<void>;
  getBalances: () => Promise<void>;
  setIsMintingLords: (value: boolean) => void;
  setIsWithdrawing: (value: boolean) => void;
  setEntropyReady: (value: boolean) => void;
  itemEntropy: bigint;
  setFetchUnlocksEntropy: (value: boolean) => void;
  setAdventurerLeveledUp: (value: boolean) => void;
  setG20Unlock: (value: boolean) => void;
  provider: ProviderInterface;
  network: Network;
  freeVRF: boolean;
}

function handleEquip(
  events: any[],
  setData: (
    queryKey: QueryKey,
    data: any,
    attribute?: string,
    index?: number
  ) => void,
  setAdventurer: (value: Adventurer) => void,
  queryData: QueryData
) {
  const equippedItemsEvents = events.filter(
    (event) => event.name === "EquippedItems"
  );
  // Equip items that are not purchases
  let equippedItems: Item[] = [];
  let unequippedItems: Item[] = [];
  for (let equippedItemsEvent of equippedItemsEvents) {
    setData("adventurerByIdQuery", {
      adventurers: [equippedItemsEvent.data[0]],
    });
    setAdventurer(equippedItemsEvent.data[0]);
    for (let equippedItem of equippedItemsEvent.data[1]) {
      const ownedItem = queryData.itemsByAdventurerQuery?.items.find(
        (item: Item) => item.item == equippedItem
      );
      if (ownedItem) {
        const modifiedItem = { ...ownedItem };
        modifiedItem.equipped = true;
        equippedItems.push(modifiedItem);
      }
    }
    for (let unequippedItem of equippedItemsEvent.data[2]) {
      const ownedItem = queryData.itemsByAdventurerQuery?.items.find(
        (item: Item) => item.item == unequippedItem
      );
      if (ownedItem) {
        const modifiedItem = { ...ownedItem };
        modifiedItem.equipped = false;
        unequippedItems.push(modifiedItem);
      }
    }
  }
  return { equippedItems, unequippedItems };
}

function handleDrop(
  events: any[],
  setData: (
    queryKey: QueryKey,
    data: any,
    attribute?: string,
    index?: number
  ) => void,
  setAdventurer: (value: Adventurer) => void
) {
  const droppedItemsEvents = events.filter(
    (event) => event.name === "DroppedItems"
  );
  let droppedItems: string[] = [];
  for (let droppedItemsEvent of droppedItemsEvents) {
    setData("adventurerByIdQuery", {
      adventurers: [droppedItemsEvent.data[0]],
    });
    setAdventurer(droppedItemsEvent.data[0]);
    for (let droppedItem of droppedItemsEvent.data[1]) {
      droppedItems.push(droppedItem);
    }
  }
  return droppedItems;
}

export function createSyscalls({
  gameContract,
  ethContract,
  lordsContract,
  beastsContract,
  pragmaContract,
  rendererContractAddress,
  addTransaction,
  account,
  queryData,
  resetData,
  setData,
  adventurer,
  addToCalls,
  calls,
  handleSubmitCalls,
  startLoading,
  stopLoading,
  setTxHash,
  setEquipItems,
  setDropItems,
  setDeathMessage,
  showDeathDialog,
  setScreen,
  setAdventurer,
  setStartOption,
  ethBalance,
  lordsBalance,
  showTopUpDialog,
  setTopUpAccount,
  setSpecialBeastDefeated,
  setSpecialBeast,
  connector,
  getEthBalance,
  getBalances,
  setIsMintingLords,
  setIsWithdrawing,
  setEntropyReady,
  itemEntropy,
  setFetchUnlocksEntropy,
  setAdventurerLeveledUp,
  setG20Unlock,
  provider,
  network,
  freeVRF,
}: SyscallsProps) {
  const gameData = new GameData();

  const onKatana = network === "localKatana" || network === "katana";

  const updateItemsXP = (
    adventurerState: Adventurer,
    itemsXP: number[],
    items: Item[]
  ) => {
    const weapon = adventurerState.weapon;
    const weaponIndex = items.findIndex((item: Item) => item.item == weapon);
    setData("itemsByAdventurerQuery", itemsXP[0], "xp", weaponIndex);
    const chest = adventurerState.chest;
    const chestIndex = items.findIndex((item: Item) => item.item == chest);
    setData("itemsByAdventurerQuery", itemsXP[1], "xp", chestIndex);
    const head = adventurerState.head;
    const headIndex = items.findIndex((item: Item) => item.item == head);
    setData("itemsByAdventurerQuery", itemsXP[2], "xp", headIndex);
    const waist = adventurerState.waist;
    const waistIndex = items.findIndex((item: Item) => item.item == waist);
    setData("itemsByAdventurerQuery", itemsXP[3], "xp", waistIndex);
    const foot = adventurerState.foot;
    const footIndex = items.findIndex((item: Item) => item.item == foot);
    setData("itemsByAdventurerQuery", itemsXP[4], "xp", footIndex);
    const hand = adventurerState.hand;
    const handIndex = items.findIndex((item: Item) => item.item == hand);
    setData("itemsByAdventurerQuery", itemsXP[5], "xp", handIndex);
    const neck = adventurerState.neck;
    const neckIndex = items.findIndex((item: Item) => item.item == neck);
    setData("itemsByAdventurerQuery", itemsXP[6], "xp", neckIndex);
    const ring = adventurerState.ring;
    const ringIndex = items.findIndex((item: Item) => item.item == ring);
    setData("itemsByAdventurerQuery", itemsXP[7], "xp", ringIndex);
  };

  const setDeathNotification = (
    type: string,
    notificationData: any,
    adventurer?: Adventurer,
    battles?: Battle[],
    hasBeast?: boolean
  ) => {
    const notifications = processNotifications(
      type,
      notificationData,
      adventurer,
      hasBeast,
      battles
    );
    // In the case of a chain of notifications we are only interested in the last
    setDeathMessage(notifications[notifications.length - 1].message);
    showDeathDialog(true);
  };

  // Helper functions
  const checkBalances = async (costToPlay?: number) => {
    const result = await pragmaContract.call("get_data_median", [
      DataType.SpotEntry("19514442401534788"),
    ]);
    const dollarToWei = BigInt(5) * BigInt(10) ** BigInt(17);
    const ethToWei = (result as PragmaPrice).price / BigInt(10) ** BigInt(8);
    const dollarPrice = dollarToWei / ethToWei;

    return {
      enoughEth: ethBalance > dollarPrice,
      enoughLords: lordsBalance > BigInt(costToPlay ?? 0),
      dollarPrice,
    };
  };

  const executeSpawn = async (formData: FormData, spawnCalls: Call[]) => {
    startLoading(
      "Create",
      "Spawning Adventurer",
      "adventurersByOwnerQuery",
      undefined
    );

    const isArcade = checkArcadeConnector(connector!);
    try {
      const tx = await handleSubmitCalls(
        account,
        spawnCalls,
        isArcade,
        Number(ethBalance),
        showTopUpDialog,
        setTopUpAccount,
        network
      );
      addTransaction({
        hash: tx?.transaction_hash,
        metadata: {
          method: `Spawn ${formData.name}`,
        },
      });
      const receipt = await provider?.waitForTransaction(tx?.transaction_hash, {
        retryInterval: getWaitRetryInterval(network!),
      });
      // Handle if the tx was reverted
      if (
        (receipt as RevertedTransactionReceiptResponse).execution_status ===
        "REVERTED"
      ) {
        throw new Error(
          (receipt as RevertedTransactionReceiptResponse).revert_reason
        );
      }
      // Here we need to process the StartGame event first and use the output for AmbushedByBeast event
      const startGameEvents = await parseEvents(
        receipt as InvokeTransactionReceiptResponse,
        undefined,
        beastsContract.address,
        "StartGame"
      );
      const events = await parseEvents(
        receipt as InvokeTransactionReceiptResponse,
        {
          name: formData["name"],
          startBlock: startGameEvents[0].data[0].startBlock,
          revealBlock: startGameEvents[0].data[0].revealBlock,
          createdTime: new Date(),
        }
      );
      const adventurerState = events.find(
        (event) => event.name === "AmbushedByBeast"
      ).data[0];
      setData("adventurersByOwnerQuery", {
        adventurers: [
          ...(queryData.adventurersByOwnerQuery?.adventurers ?? []),
          adventurerState,
        ],
      });
      setData("adventurerByIdQuery", {
        adventurers: [adventurerState],
      });
      setAdventurer(adventurerState);
      setData("latestDiscoveriesQuery", {
        discoveries: [
          events.find((event) => event.name === "AmbushedByBeast").data[1],
        ],
      });
      setData("beastQuery", {
        beasts: [
          events.find((event) => event.name === "AmbushedByBeast").data[2],
        ],
      });
      setData("battlesByBeastQuery", {
        battles: [
          events.find((event) => event.name === "AmbushedByBeast").data[3],
        ],
      });
      setData("itemsByAdventurerQuery", {
        items: [
          {
            item: adventurerState.weapon,
            adventurerId: adventurerState["id"],
            owner: true,
            equipped: true,
            ownerAddress: adventurerState["owner"],
            xp: 0,
            special1: null,
            special2: null,
            special3: null,
            isAvailable: false,
            purchasedTime: null,
            timestamp: new Date(),
          },
        ],
      });
      stopLoading(`You have spawned ${formData.name}!`, false, "Create");
      setAdventurer(adventurerState);
      setScreen("play");
      !onKatana && getEthBalance();
    } catch (e) {
      console.log(e);
      stopLoading(e, true);
    }
  };

  const addApprovalCalls = (
    spawnCalls: Call[],
    dollarPrice: bigint,
    freeVRF: boolean,
    costToPlay?: number,
    goldenTokenId?: string
  ) => [
    ...(freeVRF
      ? []
      : [
          {
            contractAddress: ethContract?.address ?? "",
            entrypoint: "approve",
            calldata: [
              gameContract?.address ?? "",
              dollarPrice.toString(),
              "0",
            ],
          },
        ]),
    ...(goldenTokenId === "0"
      ? [
          {
            contractAddress: lordsContract?.address ?? "",
            entrypoint: "approve",
            calldata: [
              gameContract?.address ?? "",
              (costToPlay! * 1.1)!.toString(),
              "0",
            ],
          },
        ]
      : []),
    ...spawnCalls,
  ];

  const handleInsufficientFunds = (currency: "eth" | "lords") => {
    showTopUpDialog(true);
    setTopUpAccount(currency);
  };

  const spawn = async (
    formData: FormData,
    goldenTokenId: string,
    revenueAddresses: string[],
    costToPlay?: number
  ) => {
    const randomInt = getRandomInt(0, revenueAddresses.length - 1);
    const selectedRevenueAddress = revenueAddresses[randomInt];

    const mintAdventurerTx = {
      contractAddress: gameContract?.address ?? "",
      entrypoint: "new_game",
      calldata: [
        selectedRevenueAddress,
        getKeyFromValue(gameData.ITEMS, formData.startingWeapon) ?? "",
        stringToFelt(formData.name).toString(),
        goldenTokenId,
        "0", // delay_stat_reveal
        rendererContractAddress,
        "0",
        "0",
      ],
    };

    addToCalls(mintAdventurerTx);
    let spawnCalls = [...calls, mintAdventurerTx];

    if (!onKatana) {
      const { enoughEth, enoughLords, dollarPrice } = await checkBalances(
        costToPlay
      );

      if (!enoughEth && !freeVRF) {
        return handleInsufficientFunds("eth");
      }
      if (!enoughLords && goldenTokenId === "0") {
        return handleInsufficientFunds("lords");
      }

      spawnCalls = addApprovalCalls(
        spawnCalls,
        dollarPrice,
        freeVRF,
        costToPlay,
        goldenTokenId
      );
    }

    await executeSpawn(formData, spawnCalls);
  };

  const explore = async (till_beast: boolean) => {
    const exploreTx = {
      contractAddress: gameContract?.address ?? "",
      entrypoint: "explore",
      calldata: [adventurer?.id?.toString() ?? "", till_beast ? "1" : "0"],
    };
    addToCalls(exploreTx);

    const isArcade = checkArcadeConnector(connector!);
    startLoading(
      "Explore",
      "Exploring",
      "discoveryByTxHashQuery",
      adventurer?.id
    );
    try {
      const tx = await handleSubmitCalls(
        account,
        [...calls, exploreTx],
        isArcade,
        Number(ethBalance),
        showTopUpDialog,
        setTopUpAccount,
        network
      );
      setTxHash(tx?.transaction_hash);
      addTransaction({
        hash: tx?.transaction_hash,
        metadata: {
          method: `Explore with ${adventurer?.name}`,
        },
      });
      const receipt = await provider?.waitForTransaction(tx?.transaction_hash, {
        retryInterval: getWaitRetryInterval(network!),
      });
      // Handle if the tx was reverted
      if (
        (receipt as RevertedTransactionReceiptResponse).execution_status ===
        "REVERTED"
      ) {
        throw new Error(
          (receipt as RevertedTransactionReceiptResponse).revert_reason
        );
      }
      const events = await parseEvents(
        receipt as InvokeTransactionReceiptResponse,
        queryData.adventurerByIdQuery?.adventurers[0] ?? NullAdventurer
      );

      // If there are any equip or drops, do them first
      const { equippedItems, unequippedItems } = handleEquip(
        events,
        setData,
        setAdventurer,
        queryData
      );
      const droppedItems = handleDrop(events, setData, setAdventurer);

      const filteredEquips = queryData.itemsByAdventurerQuery?.items?.filter(
        (item: Item) =>
          !equippedItems.some((equippedItem) => equippedItem.item == item.item)
      );
      const filteredUnequips = filteredEquips?.filter(
        (item: Item) =>
          !unequippedItems.some((droppedItem) => droppedItem.item == item.item)
      );

      const discoveries: Discovery[] = [];

      let discoveredLootEquipped = [];
      let discoveredLootBagged = [];

      const filteredDiscoveries = events.filter(
        (event) =>
          event.name === "DiscoveredHealth" ||
          event.name === "DiscoveredGold" ||
          event.name === "DiscoveredXP" ||
          event.name === "DiscoveredLoot" ||
          event.name === "DodgedObstacle" ||
          event.name === "HitByObstacle"
      );
      if (filteredDiscoveries.length > 0) {
        for (let discovery of filteredDiscoveries) {
          setData("adventurerByIdQuery", {
            adventurers: [discovery.data[0]],
          });
          setAdventurer(discovery.data[0]);
          discoveries.unshift(discovery.data[1]);
          if (discovery.name === "DiscoveredLoot") {
            const filteredEquipmentChangedEvents = events.filter(
              (event) => event.name === "EquipmentChanged"
            );
            for (let filteredEquipmentChangedEvent of filteredEquipmentChangedEvents) {
              discoveredLootEquipped.push(
                ...filteredEquipmentChangedEvent.data[1]
              );
              discoveredLootBagged.push(
                ...filteredEquipmentChangedEvent.data[2]
              );
            }
          }
        }
      }

      const filteredDrops = [
        ...(filteredUnequips ?? []),
        ...equippedItems,
        ...unequippedItems,
      ]?.filter((item: Item) => !droppedItems.includes(item.item ?? ""));
      setData("itemsByAdventurerQuery", {
        items: [
          ...filteredDrops,
          ...discoveredLootEquipped,
          ...discoveredLootBagged,
        ],
      });

      const filteredObstacles = events.filter(
        (event) =>
          event.name === "DodgedObstacle" || event.name === "HitByObstacle"
      );
      if (filteredObstacles.length > 0) {
        for (let discovery of filteredObstacles) {
          updateItemsXP(discovery.data[0], discovery.data[2], [
            ...filteredDrops,
            ...discoveredLootEquipped,
            ...discoveredLootBagged,
          ]);
          const itemsLeveledUpEvents = events.filter(
            (event) => event.name === "ItemsLeveledUp"
          );
          for (let itemsLeveledUpEvent of itemsLeveledUpEvents) {
            for (let itemLeveled of itemsLeveledUpEvent.data[1]) {
              const ownedItemIndex =
                queryData.itemsByAdventurerQuery?.items.findIndex(
                  (item: Item) => item.item == itemLeveled.item
                );
              if (itemLeveled.suffixUnlocked) {
                if (itemEntropy === BigInt(0)) {
                  setFetchUnlocksEntropy(true);
                }
              }
              if (itemLeveled.newLevel === 20) {
                setG20Unlock(true);
              }
              setData(
                "itemsByAdventurerQuery",
                itemLeveled.special1,
                "special1",
                ownedItemIndex
              );
              setData(
                "itemsByAdventurerQuery",
                itemLeveled.special2,
                "special2",
                ownedItemIndex
              );
              setData(
                "itemsByAdventurerQuery",
                itemLeveled.special3,
                "special3",
                ownedItemIndex
              );
            }
          }
        }
      }

      const filteredBeastDiscoveries = events.filter(
        (event) => event.name === "DiscoveredBeast"
      );
      if (filteredBeastDiscoveries.length > 0) {
        for (let discovery of filteredBeastDiscoveries) {
          setData("battlesByBeastQuery", {
            battles: null,
          });
          setData("adventurerByIdQuery", {
            adventurers: [discovery.data[0]],
          });
          setAdventurer(discovery.data[0]);
          discoveries.unshift(discovery.data[1]);
          setData("beastQuery", { beasts: [discovery.data[2]] });
        }
      }

      const filteredBeastAmbushes = events.filter(
        (event) => event.name === "AmbushedByBeast"
      );
      if (filteredBeastAmbushes.length > 0) {
        setData("battlesByBeastQuery", {
          battles: null,
        });
        for (let discovery of filteredBeastAmbushes) {
          setData("adventurerByIdQuery", {
            adventurers: [discovery.data[0]],
          });
          setAdventurer(discovery.data[0]);
          discoveries.unshift(discovery.data[1]);
          setData("beastQuery", { beasts: [discovery.data[2]] });
          setData("battlesByBeastQuery", {
            battles: [discovery.data[3]],
          });
        }
      }

      const reversedDiscoveries = discoveries.slice().reverse();

      const adventurerDiedEvents = events.filter(
        (event) => event.name === "AdventurerDied"
      );
      for (let adventurerDiedEvent of adventurerDiedEvents) {
        setData("adventurerByIdQuery", {
          adventurers: [adventurerDiedEvent.data[0]],
        });
        setAdventurer(adventurerDiedEvent.data[0]);
        setDeathNotification(
          "Explore",
          discoveries.reverse(),
          adventurerDiedEvent.data[0]
        );
        setScreen("start");
        setStartOption("create adventurer");
      }

      const leveledUpEvents = events.filter(
        (event) => event.name === "AdventurerLeveledUp"
      );
      if (leveledUpEvents.length > 0) {
        setScreen("upgrade");
        setAdventurerLeveledUp(true);
      }

      setData("latestDiscoveriesQuery", {
        discoveries: [
          ...discoveries,
          ...(queryData.latestDiscoveriesQuery?.discoveries ?? []),
        ],
      });
      setData("discoveryByTxHashQuery", {
        discoveries: [...discoveries.reverse()],
      });

      setEquipItems([]);
      setDropItems([]);
      stopLoading(reversedDiscoveries, false, "Explore");
      !onKatana && getEthBalance();
      setEntropyReady(false);
    } catch (e) {
      console.log(e);
      stopLoading(e, true);
    }
  };

  const attack = async (tillDeath: boolean, beastData: Beast) => {
    resetData("latestMarketItemsQuery");
    const attackTx: Call = {
      contractAddress: gameContract?.address ?? "",
      entrypoint: "attack",
      calldata: [adventurer?.id?.toString() ?? "", tillDeath ? "1" : "0"],
    };

    addToCalls(attackTx);

    const isArcade = checkArcadeConnector(connector!);
    startLoading("Attack", "Attacking", "battlesByTxHashQuery", adventurer?.id);
    try {
      const tx = await handleSubmitCalls(
        account,
        [...calls, attackTx],
        isArcade,
        Number(ethBalance),
        showTopUpDialog,
        setTopUpAccount,
        network
      );
      setTxHash(tx?.transaction_hash);
      addTransaction({
        hash: tx?.transaction_hash,
        metadata: {
          method: `Attack ${beastData.beast}`,
        },
      });
      const receipt = await provider?.waitForTransaction(tx?.transaction_hash, {
        retryInterval: getWaitRetryInterval(network!),
      });
      // Handle if the tx was reverted
      if (
        (receipt as RevertedTransactionReceiptResponse).execution_status ===
        "REVERTED"
      ) {
        throw new Error(
          (receipt as RevertedTransactionReceiptResponse).revert_reason
        );
      }
      // reset battles by tx hash
      setData("battlesByTxHashQuery", {
        battles: null,
      });
      const events = await parseEvents(
        receipt as InvokeTransactionReceiptResponse,
        queryData.adventurerByIdQuery?.adventurers[0] ?? NullAdventurer,
        indexAddress(beastsContract.address)
      );

      // If there are any equip or drops, do them first
      const { equippedItems, unequippedItems } = handleEquip(
        events,
        setData,
        setAdventurer,
        queryData
      );
      const droppedItems = handleDrop(events, setData, setAdventurer);

      const filteredEquips = queryData.itemsByAdventurerQuery?.items?.filter(
        (item: Item) =>
          !equippedItems.some((equippedItem) => equippedItem.item == item.item)
      );
      const filteredUnequips = filteredEquips?.filter(
        (item: Item) =>
          !unequippedItems.some((droppedItem) => droppedItem.item == item.item)
      );
      const filteredDrops = [
        ...(filteredUnequips ?? []),
        ...equippedItems,
        ...unequippedItems,
      ]?.filter((item: Item) => !droppedItems.includes(item.item ?? ""));
      setData("itemsByAdventurerQuery", {
        items: [...filteredDrops],
      });

      const battles = [];

      const attackedBeastEvents = events.filter(
        (event) =>
          event.name === "AttackedBeast" || event.name === "AttackedByBeast"
      );
      for (let attackedBeastEvent of attackedBeastEvents) {
        setData("adventurerByIdQuery", {
          adventurers: [attackedBeastEvent.data[0]],
        });
        setAdventurer(attackedBeastEvent.data[0]);
        battles.unshift(attackedBeastEvent.data[1]);
        setData(
          "beastQuery",
          attackedBeastEvent.data[0].beastHealth,
          "health",
          0
        );
      }

      const slayedBeastEvents = events.filter(
        (event) => event.name === "SlayedBeast"
      );
      for (let slayedBeastEvent of slayedBeastEvents) {
        setData("adventurerByIdQuery", {
          adventurers: [slayedBeastEvent.data[0]],
        });
        setAdventurer(slayedBeastEvent.data[0]);
        battles.unshift(slayedBeastEvent.data[1]);
        updateItemsXP(slayedBeastEvent.data[0], slayedBeastEvent.data[2], [
          ...filteredDrops,
        ]);
        setData(
          "beastQuery",
          slayedBeastEvent.data[0].beastHealth,
          "health",
          0
        );
        const itemsLeveledUpEvents = events.filter(
          (event) => event.name === "ItemsLeveledUp"
        );
        for (let itemsLeveledUpEvent of itemsLeveledUpEvents) {
          for (let itemLeveled of itemsLeveledUpEvent.data[1]) {
            const ownedItemIndex =
              queryData.itemsByAdventurerQuery?.items.findIndex(
                (item: Item) => item.item == itemLeveled.item
              );
            if (itemLeveled.suffixUnlocked) {
              if (itemEntropy === BigInt(0)) {
                setFetchUnlocksEntropy(true);
              }
            }
            if (itemLeveled.newLevel === 20) {
              setG20Unlock(true);
            }
            setData(
              "itemsByAdventurerQuery",
              itemLeveled.special1,
              "special1",
              ownedItemIndex
            );
            setData(
              "itemsByAdventurerQuery",
              itemLeveled.special2,
              "special2",
              ownedItemIndex
            );
            setData(
              "itemsByAdventurerQuery",
              itemLeveled.special3,
              "special3",
              ownedItemIndex
            );
          }
        }

        const transferEvents = events.filter(
          (event) => event.name === "Transfer"
        );
        for (let transferEvent of transferEvents) {
          if (
            slayedBeastEvent.data[1].special2 &&
            slayedBeastEvent.data[1].special3
          ) {
            setSpecialBeastDefeated(true);
            setSpecialBeast({
              data: slayedBeastEvent.data[1],
              tokenId: transferEvent.data.tokenId.low,
            });
          }
        }
      }

      const reversedBattles = battles.slice().reverse();

      const adventurerDiedEvents = events.filter(
        (event) => event.name === "AdventurerDied"
      );
      for (let adventurerDiedEvent of adventurerDiedEvents) {
        setData("adventurerByIdQuery", {
          adventurers: [adventurerDiedEvent.data[0]],
        });
        setAdventurer(adventurerDiedEvent.data[0]);
        const killedByBeast = battles.some(
          (battle) => battle.attacker == "Beast" && battle.adventurerHealth == 0
        );
        if (killedByBeast) {
          setDeathNotification(
            "Attack",
            reversedBattles,
            adventurerDiedEvent.data[0]
          );
        }
        setScreen("start");
        setStartOption("create adventurer");
      }

      const leveledUpEvents = events.filter(
        (event) => event.name === "AdventurerLeveledUp"
      );
      if (leveledUpEvents.length > 0) {
        setScreen("upgrade");
        setAdventurerLeveledUp(true);
      }

      setData("battlesByBeastQuery", {
        battles: [
          ...battles,
          ...(queryData.battlesByBeastQuery?.battles ?? []),
        ],
      });
      setData("battlesByAdventurerQuery", {
        battles: [
          ...battles,
          ...(queryData.battlesByAdventurerQuery?.battles ?? []),
        ],
      });
      setData("battlesByTxHashQuery", {
        battles: reversedBattles,
      });

      stopLoading(reversedBattles, false, "Attack");
      setEquipItems([]);
      setDropItems([]);
      !onKatana && getEthBalance();
      setEntropyReady(false);
    } catch (e) {
      console.log(e);
      stopLoading(e, true);
    }
  };

  const flee = async (tillDeath: boolean, beastData: Beast) => {
    const fleeTx = {
      contractAddress: gameContract?.address ?? "",
      entrypoint: "flee",
      calldata: [adventurer?.id?.toString() ?? "", tillDeath ? "1" : "0"],
    };
    addToCalls(fleeTx);

    const isArcade = checkArcadeConnector(connector!);
    startLoading("Flee", "Fleeing", "battlesByTxHashQuery", adventurer?.id);
    try {
      const tx = await handleSubmitCalls(
        account,
        [...calls, fleeTx],
        isArcade,
        Number(ethBalance),
        showTopUpDialog,
        setTopUpAccount,
        network
      );
      setTxHash(tx?.transaction_hash);
      addTransaction({
        hash: tx?.transaction_hash,
        metadata: {
          method: `Flee ${beastData.beast}`,
        },
      });
      const receipt = await provider?.waitForTransaction(tx?.transaction_hash, {
        retryInterval: getWaitRetryInterval(network!),
      });
      // Handle if the tx was reverted
      if (
        (receipt as RevertedTransactionReceiptResponse).execution_status ===
        "REVERTED"
      ) {
        throw new Error(
          (receipt as RevertedTransactionReceiptResponse).revert_reason
        );
      }
      // Add optimistic data
      const events = await parseEvents(
        receipt as InvokeTransactionReceiptResponse,
        queryData.adventurerByIdQuery?.adventurers[0] ?? NullAdventurer
      );

      // If there are any equip or drops, do them first
      const { equippedItems, unequippedItems } = handleEquip(
        events,
        setData,
        setAdventurer,
        queryData
      );
      const droppedItems = handleDrop(events, setData, setAdventurer);

      const filteredEquips = queryData.itemsByAdventurerQuery?.items?.filter(
        (item: Item) =>
          !equippedItems.some((equippedItem) => equippedItem.item == item.item)
      );
      const filteredUnequips = filteredEquips?.filter(
        (item: Item) =>
          !unequippedItems.some((droppedItem) => droppedItem.item == item.item)
      );
      const filteredDrops = [
        ...(filteredUnequips ?? []),
        ...equippedItems,
        ...unequippedItems,
      ]?.filter((item: Item) => !droppedItems.includes(item.item ?? ""));
      setData("itemsByAdventurerQuery", {
        items: [...filteredDrops],
      });

      const battles = [];

      const fleeFailedEvents = events.filter(
        (event) =>
          event.name === "FleeFailed" || event.name === "AttackedByBeast"
      );
      for (let fleeFailedEvent of fleeFailedEvents) {
        setData("adventurerByIdQuery", {
          adventurers: [fleeFailedEvent.data[0]],
        });
        setAdventurer(fleeFailedEvent.data[0]);
        battles.unshift(fleeFailedEvent.data[1]);
      }

      const fleeSucceededEvents = events.filter(
        (event) => event.name === "FleeSucceeded"
      );
      for (let fleeSucceededEvent of fleeSucceededEvents) {
        setData("adventurerByIdQuery", {
          adventurers: [fleeSucceededEvent.data[0]],
        });
        setAdventurer(fleeSucceededEvent.data[0]);
        battles.unshift(fleeSucceededEvent.data[1]);
      }

      const reversedBattles = battles.slice().reverse();

      const adventurerDiedEvents = events.filter(
        (event) => event.name === "AdventurerDied"
      );
      for (let adventurerDiedEvent of adventurerDiedEvents) {
        setData("adventurerByIdQuery", {
          adventurers: [adventurerDiedEvent.data[0]],
        });
        setAdventurer(adventurerDiedEvent.data[0]);
        const killedByBeast = battles.some(
          (battle) => battle.attacker == "Beast" && battle.adventurerHealth == 0
        );
        if (killedByBeast) {
          setDeathNotification(
            "Flee",
            reversedBattles,
            adventurerDiedEvent.data[0]
          );
        }
        setScreen("start");
        setStartOption("create adventurer");
      }

      const leveledUpEvents = events.filter(
        (event) => event.name === "AdventurerLeveledUp"
      );
      if (leveledUpEvents.length > 0) {
        setScreen("upgrade");
        setAdventurerLeveledUp(true);
      }

      setData("battlesByBeastQuery", {
        battles: [
          ...battles,
          ...(queryData.battlesByBeastQuery?.battles ?? []),
        ],
      });
      setData("battlesByAdventurerQuery", {
        battles: [
          ...battles,
          ...(queryData.battlesByAdventurerQuery?.battles ?? []),
        ],
      });
      setData("battlesByTxHashQuery", {
        battles: reversedBattles,
      });
      stopLoading(reversedBattles, false, "Flee");
      setEquipItems([]);
      setDropItems([]);
      !onKatana && getEthBalance();
      setEntropyReady(false);
    } catch (e) {
      console.log(e);
      stopLoading(e, true);
    }
  };

  const upgrade = async (
    upgrades: UpgradeStats,
    purchaseItems: ItemPurchase[],
    potionAmount: number,
    upgradeTx?: any
  ) => {
    const isArcade = checkArcadeConnector(connector!);
    startLoading("Upgrade", "Upgrading", "adventurerByIdQuery", adventurer?.id);
    try {
      let upgradeCalls = [];
      if (upgradeTx && Object.keys(upgradeTx).length !== 0) {
        upgradeCalls = calls.map((call) => {
          if (call.entrypoint === "upgrade") {
            return upgradeTx;
          }
          return call; // keep the original object if no replacement is needed
        });
      } else {
        upgradeCalls = calls;
      }
      const tx = await handleSubmitCalls(
        account,
        upgradeCalls,
        isArcade,
        Number(ethBalance),
        showTopUpDialog,
        setTopUpAccount,
        network
      );
      setTxHash(tx?.transaction_hash);
      addTransaction({
        hash: tx?.transaction_hash,
        metadata: {
          method: `Upgrade`,
        },
      });
      const receipt = await provider?.waitForTransaction(tx?.transaction_hash, {
        retryInterval: getWaitRetryInterval(network!),
      });
      // Handle if the tx was reverted
      if (
        (receipt as RevertedTransactionReceiptResponse).execution_status ===
        "REVERTED"
      ) {
        throw new Error(
          (receipt as RevertedTransactionReceiptResponse).revert_reason
        );
      }
      // Add optimistic data
      const events = await parseEvents(
        receipt as InvokeTransactionReceiptResponse,
        queryData.adventurerByIdQuery?.adventurers[0] ?? NullAdventurer
      );

      // If there are any equip or drops, do them first
      const { equippedItems, unequippedItems } = handleEquip(
        events,
        setData,
        setAdventurer,
        queryData
      );
      const droppedItems = handleDrop(events, setData, setAdventurer);

      const adventurerUpgradedEvents = events.filter(
        (event) => event.name === "AdventurerUpgraded"
      );
      if (adventurerUpgradedEvents.length > 0) {
        for (let adventurerUpgradedEvent of adventurerUpgradedEvents) {
          setData("adventurerByIdQuery", {
            adventurers: [adventurerUpgradedEvent.data],
          });
          setAdventurer(adventurerUpgradedEvent.data);
        }
      }

      // Add purchased items
      const purchaseItemsEvents = events.filter(
        (event) => event.name === "PurchasedItems"
      );
      const purchasedItems = [];
      for (let purchasedItemEvent of purchaseItemsEvents) {
        for (let purchasedItem of purchasedItemEvent.data[1]) {
          purchasedItems.push(purchasedItem);
        }
      }
      const equippedItemsEvents = events.filter(
        (event) => event.name === "EquippedItems"
      );
      for (let equippedItemsEvent of equippedItemsEvents) {
        for (let equippedItem of equippedItemsEvent.data[1]) {
          let item = purchasedItems.find((item) => item.item === equippedItem);
          if (item) {
            item.equipped = true;
          }
        }
        for (let unequippedItem of equippedItemsEvent.data[2]) {
          let item = purchasedItems.find(
            (item) => gameData.ITEMS[parseInt(item.item)] === unequippedItem
          );
          if (item) {
            item.equipped = false;
          }
        }
      }

      const filteredEquips = queryData.itemsByAdventurerQuery?.items?.filter(
        (item: Item) =>
          !equippedItems.some((equippedItem) => equippedItem.item == item.item)
      );
      const filteredUnequips = filteredEquips?.filter(
        (item: Item) =>
          !unequippedItems.some(
            (unequippedItem) => unequippedItem.item == item.item
          )
      );
      const filteredDrops = [
        ...(filteredUnequips ?? []),
        ...equippedItems,
        ...unequippedItems,
      ]?.filter((item: Item) => !droppedItems.includes(item.item ?? ""));
      setData("itemsByAdventurerQuery", {
        items: [...filteredDrops, ...purchasedItems],
      });

      // Reset items to no availability
      setData("latestMarketItemsQuery", null);
      stopLoading(
        {
          Stats: upgrades,
          Items: purchaseItems,
          Potions: potionAmount,
        },
        false,
        "Upgrade"
      );
      setScreen("play");

      !onKatana && getEthBalance();
      setEntropyReady(false);
      setG20Unlock(false);
    } catch (e) {
      console.log(e);
      stopLoading(e, true);
    }
  };

  const multicall = async (
    loadingMessage: string[],
    notification: string[],
    upgradeTx?: any
  ) => {
    const isArcade = checkArcadeConnector(connector!);
    startLoading("Multicall", loadingMessage, undefined, adventurer?.id);
    try {
      let upgradeCalls = [];
      if (upgradeTx && Object.keys(upgradeTx).length !== 0) {
        upgradeCalls = calls.map((call) => {
          if (call.entrypoint === "upgrade") {
            return upgradeTx;
          }
          return call; // keep the original object if no replacement is needed
        });
      } else {
        upgradeCalls = calls;
      }
      const tx = await handleSubmitCalls(
        account,
        upgradeCalls,
        isArcade,
        Number(ethBalance),
        showTopUpDialog,
        setTopUpAccount,
        network
      );
      setTxHash(tx?.transaction_hash);
      addTransaction({
        hash: tx?.transaction_hash,
        metadata: {
          method: "Multicall",
        },
      });
      const receipt = await provider?.waitForTransaction(tx?.transaction_hash, {
        retryInterval: getWaitRetryInterval(network!),
      });
      // Handle if the tx was reverted
      if (
        (receipt as RevertedTransactionReceiptResponse).execution_status ===
        "REVERTED"
      ) {
        throw new Error(
          (receipt as RevertedTransactionReceiptResponse).revert_reason
        );
      }
      const events = await parseEvents(
        receipt as InvokeTransactionReceiptResponse,
        queryData.adventurerByIdQuery?.adventurers[0] ?? NullAdventurer
      );

      // Handle upgrade
      const upgradeEvents = events.filter(
        (event) => event.name === "AdventurerUpgraded"
      );
      for (let upgradeEvent of upgradeEvents) {
        // Update adventurer
        setData("adventurerByIdQuery", {
          adventurers: [upgradeEvent.data],
        });
        setAdventurer(upgradeEvent.data);
        // Reset items to no availability
        setData("latestMarketItemsQuery", null);
        setScreen("play");
      }

      const droppedItems = handleDrop(events, setData, setAdventurer);

      // Add purchased items
      const purchaseItemsEvents = events.filter(
        (event) => event.name === "PurchasedItems"
      );
      const purchasedItems = [];
      for (let purchasedItemEvent of purchaseItemsEvents) {
        for (let purchasedItem of purchasedItemEvent.data[1]) {
          purchasedItems.push(purchasedItem);
        }
      }
      // If there are any equip or drops, do them first
      const { equippedItems, unequippedItems } = handleEquip(
        events,
        setData,
        setAdventurer,
        queryData
      );
      const equippedItemsEvents = events.filter(
        (event) => event.name === "EquippedItems"
      );
      for (let equippedItemsEvent of equippedItemsEvents) {
        for (let equippedItem of equippedItemsEvent.data[1]) {
          let item = purchasedItems.find((item) => item.item === equippedItem);
          if (item) {
            item.equipped = true;
          }
        }
      }
      const filteredEquips = queryData.itemsByAdventurerQuery?.items?.filter(
        (item: Item) =>
          !equippedItems.some((equippedItem) => equippedItem.item == item.item)
      );
      const filteredUnequips = filteredEquips?.filter(
        (item: Item) =>
          !unequippedItems.some((droppedItem) => droppedItem.item == item.item)
      );
      const filteredDrops = [
        ...(filteredUnequips ?? []),
        ...equippedItems,
        ...unequippedItems,
      ]?.filter((item: Item) => !droppedItems.includes(item.item ?? ""));
      setData("itemsByAdventurerQuery", {
        items: [...filteredDrops, ...purchasedItems],
      });

      const battles = [];
      // Handle the beast counterattack from swapping
      const attackedBeastEvents = events.filter(
        (event) => event.name === "AttackedByBeast"
      );
      for (let attackedBeastEvent of attackedBeastEvents) {
        setData("adventurerByIdQuery", {
          adventurers: [attackedBeastEvent.data[0]],
        });
        setAdventurer(attackedBeastEvent.data[0]);
        battles.unshift(attackedBeastEvent.data[1]);
        setData(
          "beastQuery",
          attackedBeastEvent.data[0].beastHealth,
          "health",
          0
        );
      }

      const adventurerDiedEvents = events.filter(
        (event) => event.name === "AdventurerDied"
      );
      for (let adventurerDiedEvent of adventurerDiedEvents) {
        if (
          adventurerDiedEvent.data[1].callerAddress ===
          adventurerDiedEvent.data[0].owner
        ) {
          setData("adventurerByIdQuery", {
            adventurers: [adventurerDiedEvent.data[0]],
          });
          setAdventurer(adventurerDiedEvent.data[0]);
          const killedByBeast = battles.some(
            (battle) =>
              battle.attacker == "Beast" && battle.adventurerHealth == 0
          );
          if (killedByBeast) {
            setDeathNotification(
              "Multicall",
              ["You equipped"],
              adventurerDiedEvent.data[0]
            );
          }
          setScreen("start");
          setStartOption("create adventurer");
        }
      }

      setData("battlesByBeastQuery", {
        battles: [
          ...battles,
          ...(queryData.battlesByBeastQuery?.battles ?? []),
        ],
      });
      setData("battlesByAdventurerQuery", {
        battles: [
          ...battles,
          ...(queryData.battlesByAdventurerQuery?.battles ?? []),
        ],
      });
      setData("battlesByTxHashQuery", {
        battles: [...battles.reverse()],
      });

      stopLoading(notification, false, "Multicall");
      !onKatana && getEthBalance();
      setEntropyReady(false);
      setG20Unlock(false);
    } catch (e) {
      console.log(e);
      stopLoading(e, true);
    }
  };

  const mintLords = async () => {
    const mintLords: Call = {
      contractAddress: lordsContract?.address ?? "",
      entrypoint: "mint_lords",
      calldata: [],
    };
    const isArcade = checkArcadeConnector(connector!);
    try {
      setIsMintingLords(true);
      const tx = await handleSubmitCalls(
        account!,
        [...calls, mintLords],
        isArcade,
        Number(ethBalance),
        showTopUpDialog,
        setTopUpAccount,
        network
      );
      const result = await provider?.waitForTransaction(tx?.transaction_hash, {
        retryInterval: getWaitRetryInterval(network!),
      });

      if (!result) {
        throw new Error("Lords Mint did not complete successfully.");
      }

      setIsMintingLords(false);
      getBalances();
    } catch (e) {
      setIsMintingLords(false);
      console.log(e);
    }
  };

  const withdraw = async (
    adminAccountAddress: string,
    account: AccountInterface,
    ethBalance: bigint,
    lordsBalance: bigint
  ) => {
    try {
      setIsWithdrawing(true);

      const transferEthTx = {
        contractAddress: ethContract?.address ?? "",
        entrypoint: "transfer",
        calldata: [adminAccountAddress, ethBalance ?? "0x0", "0x0"],
      };

      const transferLordsTx = {
        contractAddress: lordsContract?.address ?? "",
        entrypoint: "transfer",
        calldata: [adminAccountAddress, lordsBalance ?? "0x0", "0x0"],
      };

      // const maxFee = getMaxFee(network!);

      // const transferEthTx = {
      //   contractAddress: ethContract?.address ?? "",
      //   entrypoint: "transfer",
      //   calldata: CallData.compile([
      //     masterAccountAddress,
      //     newEthBalance ?? "0x0",
      //     "0x0",
      //   ]),
      // };

      // If they have Lords also withdraw
      const calls =
        lordsBalance > BigInt(0)
          ? [transferEthTx, transferLordsTx]
          : [transferEthTx];

      const { transaction_hash } = await account.execute(calls);

      const result = await provider.waitForTransaction(transaction_hash, {
        retryInterval: getWaitRetryInterval(network!),
      });

      if (!result) {
        throw new Error("Transaction did not complete successfully.");
      }

      setIsWithdrawing(false);
      getBalances();
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const transferAdventurer = async (
    account: AccountInterface,
    adventurerId: number,
    from: string,
    recipient: string
  ) => {
    try {
      startLoading("Transfer", "Transferring Adventurer", undefined, undefined);

      const transferTx = {
        contractAddress: gameContract?.address ?? "",
        entrypoint: "transfer_from",
        calldata: [from, recipient, adventurerId.toString() ?? "", "0"],
      };

      const { transaction_hash } = await account.execute([
        ...calls,
        transferTx,
      ]);

      const result = await provider.waitForTransaction(transaction_hash, {
        retryInterval: getWaitRetryInterval(network!),
      });

      if (!result) {
        throw new Error("Transaction did not complete successfully.");
      }

      setData("adventurersByOwnerQuery", {
        adventurers: [adventurer],
      });

      getBalances();
      stopLoading("Transferred Adventurer", false, "Transfer");
    } catch (error) {
      console.error(error);
      stopLoading(error, true);
    }
  };

  return {
    spawn,
    explore,
    attack,
    flee,
    upgrade,
    multicall,
    mintLords,
    withdraw,
    transferAdventurer,
  };
}

// Then, create a custom Hook that uses the syscalls function
export function useSyscalls(props: SyscallsProps) {
  return useMemo(() => createSyscalls(props), [props]);
}
