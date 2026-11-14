declare module "pg" {
  export type QueryResult<T> = {
    rows: T[];
  };

  export class Client {
    constructor(
      config:
        | { connectionString: string }
        | {
            host: string;
            port: number;
            user: string;
            password: string;
            database: string;
            ssl?: boolean;
          }
    );
    connect(): Promise<void>;
    query<T extends object>(sql: string, values?: readonly unknown[]): Promise<QueryResult<T>>;
    end(): Promise<void>;
  }
}
