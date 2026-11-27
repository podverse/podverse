import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type {
  DTOPerson,
  DTOPersonChannel,
  DTOPersonItem,
  PersonContentChip,
} from '@podverse/helpers';
import { isPersonContentChip } from '@podverse/helpers';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import type { ChannelBrowseStackParamList } from '../../navigation';

type PersonDetailScreenProps = NativeStackScreenProps<ChannelBrowseStackParamList, 'PersonDetail'>;

type ChannelChip = 'podcasts' | 'albums' | 'artists';

function isChannelChip(chip: PersonContentChip): chip is ChannelChip {
  return chip === 'podcasts' || chip === 'albums' || chip === 'artists';
}

export function PersonDetailScreen({ route }: PersonDetailScreenProps) {
  const { t } = useTranslation();
  const { personId } = route.params;
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { openGate } = useMembershipGate();
  const authContext = useMemo(
    () => ({ accessToken, clearSession, refreshToken, setTokens }),
    [accessToken, clearSession, refreshToken, setTokens]
  );
  const [person, setPerson] = useState<DTOPerson | null>(null);
  const [chip, setChip] = useState<PersonContentChip | null>(null);
  const [channels, setChannels] = useState<DTOPersonChannel[]>([]);
  const [items, setItems] = useState<DTOPersonItem[]>([]);

  const load = useCallback(async () => {
    const loaded = await requestWithMobileAuthRefresh(authContext, async (api) =>
      api.reqPersonByIdText(personId)
    );
    setPerson(loaded);
    const counts = loaded.counts;
    const first =
      (counts?.podcasts ?? 0) > 0
        ? 'podcasts'
        : (counts?.episodes ?? 0) > 0
          ? 'episodes'
          : (counts?.albums ?? 0) > 0
            ? 'albums'
            : (counts?.tracks ?? 0) > 0
              ? 'tracks'
              : (counts?.artists ?? 0) > 0
                ? 'artists'
                : (counts?.livestreams ?? 0) > 0
                  ? 'livestreams'
                  : null;
    setChip(first);
  }, [authContext, personId]);

  useEffect(() => {
    void load().catch(() => {
      setPerson(null);
    });
  }, [load]);

  useEffect(() => {
    if (chip === null || !isPersonContentChip(chip)) {
      return;
    }
    let cancelled = false;
    const apply = isChannelChip(chip)
      ? requestWithMobileAuthRefresh(authContext, async (api) =>
          api.reqPersonChannels(personId, { chip, limit: 50, page: 1, sort: 'recent' })
        ).then((response) => {
          if (!cancelled) {
            setChannels(response.data);
            setItems([]);
          }
        })
      : requestWithMobileAuthRefresh(authContext, async (api) =>
          api.reqPersonItems(personId, { chip, limit: 50, page: 1, sort: 'recent' })
        ).then((response) => {
          if (!cancelled) {
            setItems(response.data);
            setChannels([]);
          }
        });
    apply.catch(() => {
      if (!cancelled) {
        setChannels([]);
        setItems([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [authContext, chip, personId]);

  const follow = async () => {
    if (status !== 'authenticated') {
      openGate('needs_account');
      return;
    }
    if (person === null) {
      return;
    }
    if (person.is_followed === true) {
      await requestWithMobileAuthRefresh(authContext, async (api) =>
        api.reqAccountUnfollowPerson({ person_id_text: person.id_text })
      );
      setPerson({ ...person, is_followed: false });
      return;
    }
    await requestWithMobileAuthRefresh(authContext, async (api) =>
      api.reqAccountFollowPerson({ person_id_text: person.id_text })
    );
    setPerson({ ...person, is_followed: true });
  };

  if (person === null) {
    return null;
  }

  return (
    <View>
      <Text>{person.display_name}</Text>
      <Pressable
        onPress={() => {
          void follow();
        }}
      >
        <Text>
          {person.is_followed === true ? t('info.people.subscribed') : t('info.people.subscribe')}
        </Text>
      </Pressable>
      {chip !== null && isChannelChip(chip)
        ? channels.map((channel) => <Text key={channel.id_text}>{channel.title}</Text>)
        : items.map((item) => <Text key={item.id_text}>{item.title}</Text>)}
    </View>
  );
}
