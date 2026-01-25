export interface DTOFeedFlagStatus {
  id: number;
  status: 1 | 2 | 3 | 4 | 5 | 6; // 1=Active, 2=AlwaysParse, 3=Spam, 4=PendingArchive, 5=Archived, 6=Takedown
}
