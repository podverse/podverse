type DateLike = Date | string;

export type AccountNotificationRowLike = {
  created_at: DateLike;
};

type LastSeenAtLike = Date | string | null | undefined;

export type PartitionedAccountNotifications<T extends AccountNotificationRowLike> = {
  earlierNotifications: T[];
  newNotifications: T[];
};

function toDate(dateLike: DateLike): Date {
  if (typeof dateLike === 'string') {
    return new Date(dateLike);
  }
  return dateLike;
}

export function partitionAccountNotificationsBySeenAt<T extends AccountNotificationRowLike>(
  notifications: T[],
  lastSeenAt: LastSeenAtLike
): PartitionedAccountNotifications<T> {
  if (lastSeenAt === null || lastSeenAt === undefined) {
    return {
      earlierNotifications: [],
      newNotifications: notifications,
    };
  }

  const lastSeenAtDate = toDate(lastSeenAt);
  const earlierNotifications: T[] = [];
  const newNotifications: T[] = [];

  for (const notification of notifications) {
    const createdAtDate = toDate(notification.created_at);
    if (createdAtDate > lastSeenAtDate) {
      newNotifications.push(notification);
    } else {
      earlierNotifications.push(notification);
    }
  }

  return {
    earlierNotifications,
    newNotifications,
  };
}
