export interface DTOItemFlagStatus {
  id: number;
  status: 1 | 2 | 3 | 4; // 1=Active, 2=PendingArchive, 3=Archived, 4=PendingDelete
}
