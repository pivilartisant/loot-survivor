import NotificationComponent from "app/components/notifications/NotificationComponent";
import { processNotifications } from "app/components/notifications/NotificationHandler";
import useAdventurerStore from "app/hooks/useAdventurerStore";
import useLoadingStore from "app/hooks/useLoadingStore";
import { useQueriesStore } from "app/hooks/useQueryStore";
import { Notification, NullAdventurer } from "app/types";

export const NotificationDisplay = () => {
  const adventurer = useAdventurerStore((state) => state.adventurer);
  const hasBeast = useAdventurerStore((state) => state.computed.hasBeast);
  const { data } = useQueriesStore();
  const type = useLoadingStore((state) => state.type);
  const notificationData = useLoadingStore((state) => state.notificationData);
  const error = useLoadingStore((state) => state.error);
  const battles = data.lastBeastBattleQuery
    ? data.lastBeastBattleQuery.battles
    : [];
  const notifications: Notification[] = notificationData
    ? processNotifications(
        type,
        notificationData,
        adventurer ?? NullAdventurer,
        hasBeast,
        battles,
        error
      )
    : [];

  return <NotificationComponent notifications={notifications} />;
};
