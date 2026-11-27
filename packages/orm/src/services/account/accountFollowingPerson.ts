import { getDataSourceReadWrite } from '@orm/context.js';
import { AccountFollowingPerson } from '@orm/entities/account/accountFollowingPerson.js';
import { Person } from '@orm/entities/person/person.js';
import { Equal } from 'typeorm';

import {
  decideFollowRoom,
  FollowLimitReachedError,
  lockAccountForFollow,
  readFollowRoom,
} from './accountFollowLimit.js';

export class AccountFollowingPersonService {
  async followPerson(accountId: number, personIdText: string): Promise<void> {
    const manager = getDataSourceReadWrite().manager;
    const person = await manager.getRepository(Person).findOne({
      where: { id_text: personIdText },
    });
    if (person === null) {
      throw new PersonMissingError();
    }
    await manager.transaction(async (transaction) => {
      await lockAccountForFollow(transaction, accountId);
      const repo = transaction.getRepository(AccountFollowingPerson);
      const existing = await repo.findOne({
        where: { account_id: Equal(accountId), person_id: Equal(person.id) },
      });
      if (existing !== null) {
        return;
      }
      const decision = decideFollowRoom(await readFollowRoom(transaction, accountId), false);
      if (decision.action === 'refuse') {
        throw new FollowLimitReachedError(decision.limit);
      }
      const created = new AccountFollowingPerson();
      created.account_id = accountId;
      created.person_id = person.id;
      await repo.save(created);
    });
  }

  async unfollowPerson(accountId: number, personIdText: string): Promise<void> {
    const manager = getDataSourceReadWrite().manager;
    const person = await manager.getRepository(Person).findOne({
      where: { id_text: personIdText },
    });
    if (person === null) {
      return;
    }
    await manager.getRepository(AccountFollowingPerson).delete({
      account_id: accountId,
      person_id: person.id,
    });
  }
}

export class PersonMissingError extends Error {
  constructor() {
    super('Person not found');
    this.name = 'PersonMissingError';
  }
}

export { FollowLimitReachedError };
