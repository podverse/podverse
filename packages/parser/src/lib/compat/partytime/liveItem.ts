import { Phase4PodcastLiveItem } from 'podverse-partytime/dist/parser/phase/phase-4';
// import { isValidHttpUrl } from "@podverse/helpers";
import { getLiveItemStatusEnumValue, LiveItemStatusEnum } from '@podverse/orm';

export const compatLiveItemsDtos = (parsedLiveItems: Phase4PodcastLiveItem[]) => {
  const dtos = [];
  for (const parsedLiveItem of parsedLiveItems) {
    dtos.push({
      liveItem: {
        live_item_status:
          getLiveItemStatusEnumValue(parsedLiveItem.status) ?? LiveItemStatusEnum.Pending,
        start_time: parsedLiveItem.start,
        end_time: parsedLiveItem.end || null,
        /*
          PTDO: why is this type not working?
            Property 'url' does not exist on type 'Phase7Chat | { phase: "4"; url: string; }'.
            Property 'url' does not exist on type 'Phase7Chat'.
        */
        // chat_web_url: isValidHttpUrl(parsedLiveItem.chat?.url) && parsedLiveItem.chat.url.slice(0, 2083) || null
      },
      item: parsedLiveItem,
    });
  }

  return dtos;
};
