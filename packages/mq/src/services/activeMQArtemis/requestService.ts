import { request } from '@podverse/helpers';
import { ActiveMQArtemisServiceParams } from '.';

export class ActiveMQArtemisRequestService {
  private protocol: string;
  private host: string;
  private username: string;
  private password: string;
  private port: number;

  constructor({ protocol, host, username, password, port }: ActiveMQArtemisServiceParams) {
    this.protocol = protocol;
    this.host = host;
    this.username = username;
    this.password = password;
    this.port = port;
  }

  async request<T>(path: string): Promise<T> {
    if (!this.username || !this.password) {
      throw new Error('ActiveMQArtemis username and password are required');
    }

    const managementUri = `${this.protocol}://${this.host}:${this.port}/api${path}`;
    const auth = {
      username: this.username,
      password: this.password,
    };

    const response = await request(managementUri, { auth });
    const data = response.data;
    if (typeof data === 'string') {
      return JSON.parse(data) as T;
    } else {
      return data as T;
    }
  }
}
