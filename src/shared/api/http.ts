import axios from 'axios';
import { ENV } from '@/shared/config/env';

export const http = axios.create({
  baseURL: ENV.apiBaseUrl,
  timeout: 10_000,
});
