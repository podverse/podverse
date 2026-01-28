export interface ApiMessageResponse {
  message: string;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: {
    page: number;
    count: number | null;
    limit: number;
  };
}

export const emptyApiListResponse = {
  data: [],
  meta: {
    page: 1,
    count: 0,
    limit: 0,
  },
};
